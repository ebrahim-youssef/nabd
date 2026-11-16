const MARKER = '// nabd:release-signing'

const PROPERTIES_KEYS = ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']

const PROPERTIES_PATH = `System.getenv("NABD_SIGNING_PROPERTIES") ?: "\${System.getProperty("user.home")}/.keys/nabd/signing.properties"`

const RELEASE_SIGNING_CONFIG = `        ${MARKER}
        release {
            // Read at Gradle run time so no secret value lands in this file.
            def nabdSigningFile = new File(${PROPERTIES_PATH})
            if (nabdSigningFile.exists()) {
                def nabdSigning = new Properties()
                nabdSigningFile.withInputStream { nabdSigning.load(it) }
                def nabdStoreFile = nabdSigning.getProperty("storeFile")
                if (nabdStoreFile) {
                    def nabdStoreFilePath = new File(nabdStoreFile)
                    storeFile(nabdStoreFilePath.isAbsolute() ? nabdStoreFilePath : new File(nabdSigningFile.parentFile, nabdStoreFile))
                }
                storePassword nabdSigning.getProperty("storePassword")
                keyAlias nabdSigning.getProperty("keyAlias")
                keyPassword nabdSigning.getProperty("keyPassword")
            }
        }
`

const RELEASE_SIGNING_CHECK = `
${MARKER}-check
gradle.taskGraph.whenReady { nabdGraph ->
    // Library release tasks such as unit tests must not require app signing.
    if (nabdGraph.allTasks.find { it.project.path == ":app" && it.name.contains("Release") } != null) {
        def nabdSigningFile = new File(${PROPERTIES_PATH})
        def nabdRequiredKeys = [${PROPERTIES_KEYS.map((key) => `"${key}"`).join(', ')}]
        if (!nabdSigningFile.exists()) {
            throw new GradleException("Release signing properties not found at \${nabdSigningFile}. Create the file with keys: \${nabdRequiredKeys.join(", ")}.")
        }
        def nabdSigning = new Properties()
        nabdSigningFile.withInputStream { nabdSigning.load(it) }
        def nabdMissingKeys = nabdRequiredKeys.findAll { nabdKey ->
            !nabdSigning.getProperty(nabdKey)?.trim()
        }
        if (!nabdMissingKeys.isEmpty()) {
            throw new GradleException("Release signing properties at \${nabdSigningFile} are missing: \${nabdMissingKeys.join(", ")}. Create the file with those keys.")
        }
    }
}
`

function findClosingBraceIndex(source, openIndex) {
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function planInsertBeforeBlockEnd(source, header, insertion, anchorName) {
  const headerIndex = source.indexOf(header)
  if (headerIndex === -1) {
    throw new Error(`Missing anchor in app/build.gradle: "${header}"; cannot add ${anchorName}.`)
  }
  const openIndex = source.indexOf('{', headerIndex)
  const closeIndex = findClosingBraceIndex(source, openIndex)
  if (closeIndex === -1) {
    throw new Error(`Missing anchor in app/build.gradle: unbalanced "${header}" block; cannot add ${anchorName}.`)
  }

  let lineStart = closeIndex
  while (lineStart > 0 && (source[lineStart - 1] === ' ' || source[lineStart - 1] === '\t')) lineStart -= 1
  return { start: lineStart, end: lineStart, text: insertion }
}

function applyReleaseSigning(buildGradle) {
  if (buildGradle.includes(MARKER)) return buildGradle

  const signingConfigsEdit = planInsertBeforeBlockEnd(
    buildGradle,
    'signingConfigs {',
    RELEASE_SIGNING_CONFIG,
    'the release signing config',
  )

  const buildTypesIndex = buildGradle.indexOf('buildTypes {')
  if (buildTypesIndex === -1) {
    throw new Error('Missing anchor in app/build.gradle: "buildTypes {" block; cannot sign the release build type.')
  }
  const buildTypesOpen = buildGradle.indexOf('{', buildTypesIndex)
  const buildTypesClose = findClosingBraceIndex(buildGradle, buildTypesOpen)
  if (buildTypesClose === -1) {
    throw new Error('Missing anchor in app/build.gradle: unbalanced "buildTypes {" block; cannot sign the release build type.')
  }

  const buildTypes = buildGradle.slice(buildTypesOpen, buildTypesClose)
  const releaseOffset = buildTypes.indexOf('release {')
  if (releaseOffset === -1) {
    throw new Error('Missing anchor in app/build.gradle: "release {" build type; cannot sign the release build type.')
  }
  const releaseOpen = buildTypes.indexOf('{', releaseOffset)
  const releaseClose = findClosingBraceIndex(buildTypes, releaseOpen)
  if (releaseClose === -1) {
    throw new Error('Missing anchor in app/build.gradle: unbalanced "release {" build type; cannot sign the release build type.')
  }

  const debugSigning = 'signingConfig signingConfigs.debug'
  const debugSigningOffset = buildGradle.indexOf(debugSigning, buildTypesOpen + releaseOpen)
  if (debugSigningOffset === -1 || debugSigningOffset > buildTypesOpen + releaseClose) {
    throw new Error(`Missing anchor in app/build.gradle: "${debugSigning}" inside the release build type; cannot point release at the release signing config.`)
  }

  const edits = [
    { start: buildGradle.length, end: buildGradle.length, text: RELEASE_SIGNING_CHECK },
    signingConfigsEdit,
    { start: debugSigningOffset, end: debugSigningOffset + debugSigning.length, text: 'signingConfig signingConfigs.release' },
  ].sort((first, second) => second.start - first.start)

  let output = buildGradle
  for (const edit of edits) {
    output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`
  }

  return output
}

function withNabdReleaseSigning(config) {
  const { withAppBuildGradle } = require('expo/config-plugins')

  return withAppBuildGradle(config, (configWithGradle) => {
    configWithGradle.modResults.contents = applyReleaseSigning(configWithGradle.modResults.contents)
    return configWithGradle
  })
}

module.exports = withNabdReleaseSigning
module.exports._internals = { applyReleaseSigning, findClosingBraceIndex }
