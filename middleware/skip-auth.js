export default function ({ app }) {
  if (app.$config.skipAuth) {
    return
  }

  app.$auth.setUser({
    displayName: 'Skipped auth'
  })
  app.$auth.$storage.setState('loggedIn', true)
}
