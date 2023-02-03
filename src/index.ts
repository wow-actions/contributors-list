import * as fs from 'fs/promises'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { minify } from 'html-minifier'
import mustache from 'mustache'
import { OctokitResponse } from '@octokit/types'
import * as util from './util'

export async function run() {
  try {
    const options = util.getInputs()
    const octokit = util.getOctokit()

    core.debug(`inputs: \n ${JSON.stringify(options, null, 2)}`)

    const { context } = github
    const parts = options.repo.split('/')
    const owner = parts.length === 2 ? parts[0] : context.repo.owner
    const repo = parts.length === 2 ? parts[1] : context.repo.repo
    const users = await util.getUsers(octokit, owner, repo, options)
    const map = {
      contributors: users.contributors.map((i) => i.name),
      collaborators: users.collaborators.map((i) => i.name),
      bots: users.bots.map((i) => i.name),
    }

    core.info(
      `contributors: ${users.contributors.length}, ${JSON.stringify(
        map.contributors,
        null,
        2,
      )}`,
    )

    core.info(
      `collaborators: ${users.collaborators.length}, ${JSON.stringify(
        map.collaborators,
        null,
        2,
      )}`,
    )

    core.info(
      `bots: ${users.bots.length}, ${JSON.stringify(map.bots, null, 2)}`,
    )

    const annotation = `<!-- ${JSON.stringify(map)} -->`
    let preContent: string | null
    let preResponse: OctokitResponse<any, any> | null
    if (options.noCommit) {
      preContent = await fs.readFile(options.svgPath, 'utf-8')
    } else {
      preResponse = await util.getLargeFile(octokit, options.svgPath)
      preContent = preResponse
        ? Buffer.from(preResponse.data.content, 'base64').toString()
        : null
    }

    if (preContent) {
      const reg = /<!--(.|[\r\n])*?-->/g
      const matches = preContent.match(reg)
      if (matches && matches.some((match) => match === annotation)) {
        return core.info('No updated required, content not changed.')
      }
    }

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
      contributorsHeight: util.calcSectionHeight(
        users.contributors.length,
        options,
      ),
      botsHeight: util.calcSectionHeight(users.bots.length, options),
      collaboratorsHeight: util.calcSectionHeight(
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
            // eslint-disable-next-line no-eval
            return render(`${eval(sub)}`)
          } catch (error) {
            return render(sub)
          }
        }
      },
    })

    const content = minify(`${annotation}\n${rendered}`)
    core.debug(`content: \n${content}`)

    // eslint-disable-next-line no-unused-expressions
    options.noCommit
      ? await fs.writeFile(options.svgPath, Buffer.from(content), 'utf-8')
      : await octokit.rest.repos.createOrUpdateFileContents({
          ...context.repo,
          path: options.svgPath,
          content: Buffer.from(content).toString('base64'),
          message: options.commitMessage,
          sha: preResponse! ? preResponse.data.sha : undefined,
        })

    core.info(`${preContent ? 'Updated' : 'Generated'} : "${options.svgPath}"`)
  } catch (e) {
    core.setFailed(e)
  }
}

run()
