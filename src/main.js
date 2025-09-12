const core = require('@actions/core')
const {spawnSync} = require('child_process')

const env = {
  PATH: process.env.PATH,
  FORCE_COLOR: 'true',
  DOTNET_CLI_HOME: '/tmp',
  DOTNET_NOLOGO: 'true',
  HOME: process.env.HOME,
}

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
    result = spawnSync(command, arguments, {timeout, env, stdio: 'inherit'})
    endTime = new Date()

    regexPattern = /^Total score ([0-9]+) \/ ([0-9]+)\s*$/gm

    core.notice(result.stdout)

    match = result.stdout.match(regexPattern)
    
    totalPoints = match[0]
    maxPoints = match[1]

    const text = `Points ${totalPoints}/${maxPoints}`;
    const summary = JSON.stringify({ totalPoints, maxPoints })

    // create notice annotations with the final result and summary
    core.notice(text, {
      title: "Autograding complete",
    })

    core.notice(summary, {
      title: "Autograding report",
    })

    // status = score == maxScore ? "pass" : "fail"

    // core.notice(status, {
    //   title: "Autograding status"
    // })

    // result = generateResult(status, testName, command, result.stdout, endTime - startTime, score, maxScore)
    
  } catch (error) {
    endTime = new Date()
    // const {status, errorMessage} = getErrorMessageAndStatus(error, command)

    core.warning(error.message, {
      title: "Autograding error"
    })
    
    // result = generateResult(status, testName, command, errorMessage, endTime - startTime, 0, maxScore)
  }

  // core.setOutput('result', btoa(JSON.stringify(result)))
}

run()
