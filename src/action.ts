import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'

export namespace Action {
  export async function run() {
    try {
      const octokit = Util.getOctokit()
      const options = Util.getInputs()
      const context = github.context
      const none = options.repo.split('/')
      const owner = none.length === 2 ? none[0] : context.repo.owner
      const repo = none.length === 2 ? none[1] : context.repo.repo

      core.debug(`inputs: \n ${JSON.stringify(options, null, 2)}`)
      core.debug(`owner: ${owner}, repo: ${repo}`)

      const users = Util.getUsers(octokit, owner, repo, options)

      core.debug(`${JSON.stringify(users, null, 2)}`)
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
