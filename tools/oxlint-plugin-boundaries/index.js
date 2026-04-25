// Custom oxlint JS plugin enforcing the bulletproof-react unidirectional
// import rule:
//
//   features/X may NOT import from features/Y (X !== Y)
//   shared/*  may NOT import from features/*    (only app/ is allowed to)
//
// Loaded via .oxlintrc.json -> jsPlugins.

function locate(filename) {
  if (!filename) return null
  const m = filename.match(/[\\/]src[\\/](?:features[\\/]([^\\/]+)|([^\\/]+))/)
  if (!m) return null
  return m[1] ? { kind: 'feature', name: m[1] } : { kind: 'shared', name: m[2] }
}

function resolveSpecifier(specifier) {
  if (typeof specifier !== 'string') return null
  const m = specifier.match(/^#\/(?:features\/([^/]+)|([^/]+))/)
  if (!m) return null
  return m[1] ? { kind: 'feature', name: m[1] } : { kind: 'shared', name: m[2] }
}

const rule = {
  meta: { type: 'problem' },
  create(context) {
    const here = locate(context.filename)
    if (!here) return {}

    const check = (node) => {
      if (!node || !node.source) return
      const target = resolveSpecifier(node.source.value)
      if (!target) return

      if (here.kind === 'feature' && target.kind === 'feature' && here.name !== target.name) {
        context.report({
          node,
          message: `feature "${here.name}" must not import from feature "${target.name}"`,
        })
        return
      }

      if (here.kind === 'shared' && target.kind === 'feature' && here.name !== 'app') {
        context.report({
          node,
          message: `shared module "${here.name}" must not import from features/* (only app/ may)`,
        })
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    }
  },
}

export default {
  meta: { name: 'boundaries' },
  rules: { 'no-cross-feature-imports': rule },
}
