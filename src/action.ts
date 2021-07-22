import * as core from '@actions/core'
import * as github from '@actions/github'
import { minify } from 'html-minifier'
import mustache from 'mustache'
import { Util } from './util'
import * as fs from 'fs'

export namespace Action {
  export async function run() {
    try {
      const context = github.context
      const octokit = Util.getOctokit()
      const options = Util.getInputs()

      core.debug(`inputs: \n ${JSON.stringify(options, null, 2)}`)

      const parts = options.repo.split('/')
      const owner = parts.length === 2 ? parts[0] : context.repo.owner
      const repo = parts.length === 2 ? parts[1] : context.repo.repo
      const users = await Util.getUsers(octokit, owner, repo, options)

      core.info(
        `contributors: ${users.contributors.length}, ${JSON.stringify(
          users.contributors.map((i) => i.name),
          null,
          2,
        )}`,
      )

      core.info(
        `collaborators: ${users.collaborators.length}, ${JSON.stringify(
          users.collaborators.map((i) => i.name),
          null,
          2,
        )}`,
      )

      core.info(
        `bots: ${users.bots.length}, ${JSON.stringify(
          users.bots.map((i) => i.name),
          null,
          2,
        )}`,
      )

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

      let preContent
      let preResponse
      if (options.noCommit) {
        preContent = await fs.readFileSync(options.svgPath, 'utf-8')
      } else {
        preResponse = await Util.getLargeFile(octokit, options.svgPath)
        preContent = preResponse
          ? Buffer.from(preResponse.data.content, 'base64').toString()
          : null
      }

      if (preContent !== content) {
        options.noCommit
          ? fs.writeFileSync(options.svgPath, Buffer.from(content), 'utf-8')
          : await octokit.repos.createOrUpdateFileContents({
              ...context.repo,
              path: options.svgPath,
              content: Buffer.from(content).toString('base64'),
              message: options.commitMessage,
              sha: preResponse ? preResponse.data.sha : undefined,
            })

        core.info(`Generated: "${options.svgPath}"`)
      } else {
        core.debug('No updated required, content not changed.')
      }
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
