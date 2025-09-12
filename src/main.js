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
        score: score,
        message,
        test_code: command,
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
    result = spawnSync('bash', ['set_score.sh', '9'], {timeout, env, stdio: 'inherit'})
    endTime = new Date()

    score = result.status
    core.warning("Score: " + score)
    core.warning("Output: " + result.output)

    status = "pass" ? score == maxScore : "fail"

    result = generateResult(status, testName, command, result.stdout, endTime - startTime, result.status, maxScore)
    
  } catch (error) {
    endTime = new Date()
    const {status, errorMessage} = getErrorMessageAndStatus(error, command)
    result = generateResult(status, testName, command, errorMessage, endTime - startTime, 0, maxScore)
  }

  core.setOutput('result', btoa(JSON.stringify(result)))
}

run()
