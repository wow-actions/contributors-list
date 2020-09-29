import * as core from '@actions/core'
import * as github from '@actions/github'
import sharp from 'sharp'
import fetch from 'node-fetch'
import { imageSize } from 'image-size'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function getInputs() {
    const svgWidth = parseInt(core.getInput('svgWidth'), 10)
    const avatarSize = parseInt(core.getInput('avatarSize'), 10)
    const avatarMargin = parseInt(core.getInput('avatarMargin'), 10)
    const userNameHeight = parseInt(core.getInput('userNameHeight'), 10)
    return {
      repo: core.getInput('repo') || '/',
      sort: core.getInput('sort') === 'true',
      includeBots: core.getInput('includeBots') === 'true',
      roundAvatar: core.getInput('roundAvatar') !== 'false',
      affiliation: core.getInput('affiliation') as 'all' | 'direct' | 'outside',
      svgPath: core.getInput('svgPath') || './contributors.svg',
      svgTemplate: core.getInput('svgTemplate'),
      itemTemplate: core.getInput('itemTemplate'),
      commitMessage: core.getInput('commitMessage'),
      svgWidth: isNaN(svgWidth) ? 740 : svgWidth,
      avatarSize: isNaN(avatarSize) ? 64 : avatarSize,
      avatarMargin: isNaN(avatarMargin) ? 5 : avatarMargin,
      userNameHeight: isNaN(userNameHeight) ? 0 : userNameHeight,
    }
  }

  export async function getFile(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ) {
    try {
      const response = await octokit.repos.getContent({
        ...github.context.repo,
        path,
      })

      if (response.headers.status === '404') {
        return null
      }
      return response
    } catch (err) {
      return null
    }
  }

  export function calcSectionHeight(
    total: number,
    options: ReturnType<typeof getInputs>,
  ) {
    const svgWidth = options.svgWidth
    const avatarMargin = options.avatarMargin
    const avatarWidth = options.avatarSize
    const avatarHeight = options.avatarSize
    const itemWidth = avatarWidth + 2 * avatarMargin
    const itemHeight = avatarHeight + 2 * avatarMargin + options.userNameHeight
    const colCount = Math.floor(svgWidth / itemWidth)

    return itemHeight * Math.ceil(total / colCount)
  }

  async function getAvatar(url: string, options: ReturnType<typeof getInputs>) {
    return fetch(url).then(async (res) => {
      const type = res.headers.get('content-type')
      const prefix = `data:${type};base64,`

      return res.buffer().then((buffer) => {
        if (options.roundAvatar) {
          const box = imageSize(buffer)
          const size = Math.min(
            box.width || options.avatarSize,
            box.height || options.avatarSize,
          )
          const r = size / 2
          const mask = Buffer.from(
            `<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`,
          )

          return sharp(buffer)
            .resize(size, size)
            .composite([
              {
                input: mask,
                blend: 'dest-in',
              },
            ])
            .webp()
            .toBuffer()
            .then((buffer) => prefix + buffer.toString('base64'))
        }

        return prefix + buffer.toString('base64')
      })
    })
  }

  export async function getUsers(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    options: ReturnType<typeof getInputs>,
  ) {
    const contributorsRes = await octokit.repos.listContributors({
      owner,
      repo,
    })

    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner,
      repo,
      affiliation: options.affiliation,
    })

    const contributors = options.includeBots
      ? contributorsRes.data
      : contributorsRes.data.filter((el) => el.type !== 'Bot')
    const bots = contributorsRes.data.filter((el) => el.type === 'Bot')

    if (options.sort) {
      contributors.sort((a, b) => b.contributions - a.contributions)
      bots.sort((a, b) => b.contributions - a.contributions)
    }

    const getBBox = (index: number) => {
      const svgWidth = options.svgWidth
      const avatarMargin = options.avatarMargin
      const avatarWidth = options.avatarSize
      const avatarHeight = options.avatarSize
      const colCount = Math.floor(svgWidth / (avatarWidth + 2 * avatarMargin))
      const colIndex = index % colCount
      const rowIndex = Math.floor(index / colCount)

      return {
        x: avatarMargin + colIndex * (avatarWidth + avatarMargin),
        y: avatarMargin + rowIndex * (avatarHeight + avatarMargin),
        width: avatarWidth,
        height: avatarHeight,
      }
    }

    const deferred1 = contributors.map(async (user, i) => ({
      ...getBBox(i),
      name: user.login,
      avatar: await getAvatar(user.avatar_url, options),
      url: user.html_url,
      type: user.type === 'Bot' ? 'bot' : 'contributor',
    }))

    const deferred2 = bots.map(async (user, i) => ({
      ...getBBox(i),
      name: user.login,
      avatar: await getAvatar(user.avatar_url, options),
      url: user.html_url,
      type: 'bot',
    }))

    const deferred3 = collaborators.map(async (user, i) => ({
      ...getBBox(i),
      name: user.login,
      avatar: await getAvatar(user.avatar_url, options),
      url: user.html_url,
      type: 'collaborator',
    }))

    return await Promise.all([
      Promise.all(deferred1),
      Promise.all(deferred2),
      Promise.all(deferred3),
    ]).then(([contributors, bots, collaborators]) => ({
      contributors,
      bots,
      collaborators,
    }))
  }
}
