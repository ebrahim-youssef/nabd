import { definePlugin, defineRule } from 'vite-plus/lint/plugins'

const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'global'])

function getPropertyName(member) {
  if (member.type !== 'MemberExpression') return undefined
  if (!member.computed && member.property.type === 'Identifier') return member.property.name
  if (member.property.type === 'Literal' && typeof member.property.value === 'string') {
    return member.property.value
  }
  return undefined
}

function isBuiltinObject(node, name) {
  if (node.type === 'Identifier') return node.name === name
  return (
    node.type === 'MemberExpression' &&
    getPropertyName(node) === name &&
    node.object.type === 'Identifier' &&
    GLOBAL_OBJECTS.has(node.object.name)
  )
}

function getDestructuredPropertyName(property) {
  if (property.type !== 'Property') return undefined
  if (!property.computed && property.key.type === 'Identifier') return property.key.name
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value
  }
  return undefined
}

const noAmbientTime = defineRule({
  meta: {
    messages: {
      dateNow: 'Pure native logic receives time as a parameter; Date.now() is forbidden.',
      mathRandom:
        'Pure native logic receives generated values as parameters; Math.random() is forbidden.',
      dateConstructor: 'Pure native logic receives time as a parameter; new Date() is forbidden.',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const property = getPropertyName(node)
        if (property === 'now' && isBuiltinObject(node.object, 'Date')) {
          context.report({ node, messageId: 'dateNow' })
        }
        if (property === 'random' && isBuiltinObject(node.object, 'Math')) {
          context.report({ node, messageId: 'mathRandom' })
        }
      },
      NewExpression(node) {
        if (node.arguments.length === 0 && isBuiltinObject(node.callee, 'Date')) {
          context.report({ node, messageId: 'dateConstructor' })
        }
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || !node.init) return

        for (const property of node.id.properties) {
          const name = getDestructuredPropertyName(property)
          if (name === 'now' && isBuiltinObject(node.init, 'Date')) {
            context.report({ node: property, messageId: 'dateNow' })
          }
          if (name === 'random' && isBuiltinObject(node.init, 'Math')) {
            context.report({ node: property, messageId: 'mathRandom' })
          }
        }
      },
    }
  },
})

export default definePlugin({
  meta: { name: 'nabd' },
  rules: { 'no-ambient-time': noAmbientTime },
})
