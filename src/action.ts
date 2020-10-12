import * as core from '@actions/core'
import * as github from '@actions/github'
import { minify } from 'html-minifier'
import mustache from 'mustache'
import { Util } from './util'

export namespace Action {
  export async function run() {
    try {
      const context = github.context
      const octokit = Util.getOctokit()
      const options = Util.getInputs()
      const none = options.repo.split('/')
      const owner = none.length === 2 ? none[0] : context.repo.owner
      const repo = none.length === 2 ? none[1] : context.repo.repo

      core.debug(`inputs: \n ${JSON.stringify(options, null, 2)}`)

      const users = await Util.getUsers(octokit, owner, repo, options)

      mustache.parse(options.itemTemplate)

      const contributors = users.contributors
        .map((user) => mustache.render(options.itemTemplate, user))
        .join('\n')

      const bots = users.bots
        .map((user) => mustache.render(options.itemTemplate, user))
        .join('\n')

      const collaborators = users.collaborators
        .map((user) => mustache.render(options.itemTemplate, user))
        .join('\n')

      const heights = {
        contributorsHeight: Util.calcSectionHeight(
          users.contributors.length,
          options,
        ),
        botsHeight: Util.calcSectionHeight(users.bots.length, options),
        collaboratorsHeight: Util.calcSectionHeight(
          users.collaborators.length,
          options,
        ),
      }

      const rendered = mustache.render(options.svgTemplate, {
        contributors,
        bots,
        collaborators,
        width: options.svgWidth,
        ...heights,
        sum() {
          return (text: string, render: (raw: string) => string) => {
            const sub = mustache.render(text, heights)
            try {
              return render(`${eval(sub)}`) // tslint:disable-line
            } catch (error) {
              return render(sub)
            }
          }
        },
      })

      const content = minify(rendered)

      core.debug(`content: \n${content}`)

      const preResponse = await Util.getLargeFile(octokit, options.svgPath)
      const preContent = preResponse
        ? Buffer.from(preResponse.data.content, 'base64').toString()
        : null

      if (preContent !== content) {
        await octokit.repos.createOrUpdateFileContents({
          ...context.repo,
          path: options.svgPath,
          content: Buffer.from(content).toString('base64'),
          message: options.commitMessage,
          sha: preResponse ? preResponse.data.sha : undefined,
        })

        core.info(`Generated: "${options.svgPath}"`)
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
