const core = require('@actions/core')
const {DefaultArtifactClient} = require('@actions/artifact')
const {spawnSync} = require('child_process')
const fs = require('fs');
const github = require('@actions/github');

const env = {
  PATH: process.env.PATH,
  FORCE_COLOR: 'true',
  DOTNET_CLI_HOME: '/tmp',
  DOTNET_NOLOGO: 'true',
  HOME: process.env.HOME,
}

const artifact = new DefaultArtifactClient()

function btoa(str) {
  return Buffer.from(str).toString('base64')
}

function generateResult(status, testName, command, message, duration, score, maxScore) {
  return {
    version: 1,
    status,
    max_score: maxScore,
    tests: [
      {
        name: testName,
        status,
        score,
        message,
        test_code: '',
        filename: '',
        line_no: 0,
        duration,
      },
    ],
  }
}

function getErrorMessageAndStatus(error, command) {
  if (error.message.includes('ETIMEDOUT')) {
    return { status: 'error', errorMessage: 'Command timed out' }
  }
  if (error.message.includes('command not found')) {
    return { status: 'error', errorMessage: `Unable to locate executable file: ${command}` }
  }
  if (error.message.includes('Command failed')) {
    return { status: 'fail', errorMessage: 'failed with exit code 1' }
  }
  return  { status: 'error', errorMessage: error.message }
}

async function run() {
  const testName = core.getInput('test-name', {required: true})
  const setupCommand = core.getInput('setup-command')
  const command = core.getInput('command', {required: true})
  const arguments = JSON.parse(core.getInput('arguments', {required: true}))
  const timeout = parseFloat(core.getInput('timeout') || 10) * 60000 // Convert to minutes
  const maxScore = parseInt(core.getInput('max-score') || 0)


  const reportName = 'report_' + github.context.sha.substring(0, 7)

  let output = ''
  let startTime
  let endTime
  let result

  try {
    if (setupCommand) {
      execSync(setupCommand, {timeout, env, stdio: 'inherit'})
    }

    startTime = new Date()
    // result = spawnSync(command, arguments, {timeout, env, stdio: 'inherit'})
    result = spawnSync(command, arguments, {timeout, env})
    endTime = new Date()

    score = result.status

    core.warning(result.stdout, {
      title: "output",
    })
    core.warning("TESTING", {
      title: "stdout",
    })
    // core.setOutput('report', result.stdout)

    fs.writeFileSync(reportName + '.txt', result.stdout)


    totalPoints = score
    maxPoints = maxScore

    if (score > maxScore) {
      core.warning('Score ' + score + ' is larger than maxScore. Setting score to 0, please consult with the instructor.')
      score = 0
    }

    const text = `Points ${totalPoints}/${maxPoints}`;
    const summary = JSON.stringify({ totalPoints, maxPoints })

    // create notice annotations with the final result and summary
    core.notice(text, {
      title: "Autograding complete",
    })

    core.notice(summary, {
      title: "Autograding report",
    })

    if (score < maxScore) {
      core.setFailed("Score less than " + maxScore)
    }

    // status = score == maxScore ? "pass" : "fail"

    // core.notice(status, {
    //   title: "Autograding status"
    // })

    // result = generateResult(status, testName, command, result.stdout, endTime - startTime, score, maxScore)


    
    const {id, size} = await artifact.uploadArtifact(
      // name of the artifact
      reportName,
      // files to include (supports absolute and relative paths)
      ['./' + reportName + '.txt'],
      // {
      //   // optional: how long to retain the artifact
      //   // if unspecified, defaults to repository/org retention settings (the limit of this value)
      //   retentionDays: 10
      // }
    )

    core.notice(await id, {
      title: "Artifact ID"
    })
    
  } catch (error) {
    endTime = new Date()
    // const {status, errorMessage} = getErrorMessageAndStatus(error, command)

    core.warning(error.message, {
      title: "Autograding error"
    })

    core.setFailed("Encountered error")
    
    // result = generateResult(status, testName, command, errorMessage, endTime - startTime, 0, maxScore)
  }

  // core.setOutput('result', btoa(JSON.stringify(result)))
}

run()
