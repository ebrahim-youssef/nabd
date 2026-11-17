import { definePlugin, defineRule } from 'vite-plus/lint/plugins'

const noAmbientTime = defineRule({
  meta: {
    messages: {
      dateNow: 'Pure native logic receives time as a parameter; Date.now() is forbidden.',
      mathRandom:
        'Pure native logic receives generated values as parameters; Math.random() is forbidden.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') return

        const property = callee.computed ? callee.property.value : callee.property.name
        if (callee.object.name === 'Date' && property === 'now') {
          context.report({ node, messageId: 'dateNow' })
        }
        if (callee.object.name === 'Math' && property === 'random') {
          context.report({ node, messageId: 'mathRandom' })
        }
      },
    }
  },
})

export default definePlugin({
  meta: { name: 'nabd' },
  rules: { 'no-ambient-time': noAmbientTime },
})
