const core = require('@actions/core')
const {spawnSync} = require('child_process')
const fs = require('fs');

const env = {
  PATH: process.env.PATH,
  FORCE_COLOR: 'true',
  DOTNET_CLI_HOME: '/tmp',
  DOTNET_NOLOGO: 'true',
  HOME: process.env.HOME,
}

function run() {
  const testName = core.getInput('test-name', {required: true})
  const setupCommand = core.getInput('setup-command')
  const command = core.getInput('command', {required: true})
  const arguments = JSON.parse(core.getInput('arguments', {required: true}))
  const timeout = parseFloat(core.getInput('timeout') || 10) * 60000 // Convert to minutes
  const maxScore = parseInt(core.getInput('max-score') || 0)

  let output = ''
  let startTime
  let endTime
  let result

  try {
    if (setupCommand) {
      execSync(setupCommand, {timeout, env, stdio: 'inherit'})
    }

    startTime = new Date()
    result = spawnSync(command, arguments, {timeout, env})
    endTime = new Date()

    score = result.status

    if (result.stderr != null) {
      core.error(result.stderr.toString('utf8'), {
        title: "Autograder error",
      })
    }

    core.setOutput('report', result.stdout.toString('utf8'))

    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, result.stdout)

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
   
  } catch (error) {
    endTime = new Date()

    core.warning(error.message, {
      title: "Autograding error"
    })

    core.setFailed("Encountered error")
  }
}

run()
