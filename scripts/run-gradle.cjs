const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { dirname, join } = require('node:path')

function runGradle(args) {
  const androidDirectory = join(dirname(__dirname), 'android')
  if (!existsSync(androidDirectory)) {
    console.error('android/ does not exist. Run expo prebuild --platform android first.')
    return 1
  }

  const isWindows = process.platform === 'win32'
  const gradlewPath = join(androidDirectory, isWindows ? 'gradlew.bat' : 'gradlew')
  const command = isWindows && gradlewPath.includes(' ') ? `"${gradlewPath}"` : gradlewPath
  const result = spawnSync(command, args, {
    cwd: androidDirectory,
    stdio: 'inherit',
    shell: isWindows,
  })

  if (result.error) {
    console.error(`Could not start the Gradle wrapper: ${result.error.message}`)
    return 1
  }

  return result.status ?? 1
}

process.exit(runGradle(process.argv.slice(2)))
