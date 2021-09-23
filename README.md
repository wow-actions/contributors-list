<h1 align="center">Contributors List</h1>

<p align="center">
  <a href="/wow-actions/contributors-list/blob/master/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/wow-actions/contributors-list?style=flat-square"></a>
  <a href="https://www.typescriptlang.org" rel="nofollow"><img alt="Language" src="https://img.shields.io/badge/language-TypeScript-blue.svg?style=flat-square"></a>
  <a href="https://github.com/wow-actions/contributors-list/pulls"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=flat-square" ></a>
  <a href="https://github.com/marketplace/actions/contributors-list" rel="nofollow"><img alt="website" src="https://img.shields.io/static/v1?label=&labelColor=505050&message=marketplace&color=0076D6&style=flat-square&logo=google-chrome&logoColor=0076D6" ></a>
  <a href="https://github.com/wow-actions/contributors-list/actions/workflows/release.yml"><img alt="build" src="https://img.shields.io/github/workflow/status/wow-actions/contributors-list/Release/master?logo=github&style=flat-square" ></a>
  <a href="https://lgtm.com/projects/g/wow-actions/contributors-list/context:javascript" rel="nofollow"><img alt="Language grade: JavaScript" src="https://img.shields.io/lgtm/grade/javascript/g/wow-actions/contributors-list.svg?logo=lgtm&style=flat-square" ></a>
</p>

<p align="center"><strong>Automatically generate <code>contributors.svg</code> for your repository</strong></p>

## Usage

Create a workflow file such as `.github/workflows/contributors.yml`:

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          svgPath: CONTRIBUTORS.svg
```

### Inputs

Various inputs are defined to let you configure the action:

> Note: [Workflow command and parameter names are not case-sensitive](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-commands-for-github-actions#about-workflow-commands).

- `sort`: Specify if sort contributors by contributions or not. Default: `true`.
- `round`: Specify if clip the avatar to rounded or not. Default: `true`.
- `count`: Specify the max count of contributors listed. Default list all contributors.
- `truncate`: Truncate username by specified length, `0` for no truncate. Default: `12`.
- `affiliation`: Specify the type of collaborators. Default: `direct`. Options: `all/direct/outside`.
  - `'outside'`: All outside collaborators of an organization-owned repository.
  - `'direct'`: All collaborators with permissions to an organization-owned repository, regardless of organization membership status.
  - `'all'`: All collaborators the authenticated user can see.
- `includeBots`: Specify if include bots in the contributors list or not. Default `true`.
- `excludeUsers`: Users separated by space to exclude in the contributors list.
- `svgPath`: The path to save generated SVG. Default `'CONTRIBUTORS.svg'`.
- `svgWidth`: Width of the generated SVG. Default: `740`.
- `avatarSize`: Size of user avatar. Default: `64`.
- `avatarMargin`: Margin of user avatar. Default: `5`.
- `userNameHeight`: Height of user name. Default: `0`.
- `svgTemplate`: Template to render SVG. Default:
  ```html
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    version="1.1"
    width="{{ width }}"
    height="{{ contributorsHeight }}"
  >
    <style>
      .contributor-link {
        cursor: pointer;
      }
    </style>
    {{{ contributors }}}
  </svg>
  ```
- `itemTemplate`: Template to render user item. Default:
  ```html
  <a
    id="{{{ name }}}"
    title="{{{ name }}}"
    xlink:href="{{{ url }}}"
    class="contributor-link"
    target="_blank"
    rel="nofollow sponsored"
  >
    <image
      x="{{ x }}"
      y="{{ y }}"
      width="{{ width }}"
      height="{{ height }}"
      xlink:href="{{{ avatar }}}"
    />
  </a>
  ```
- `commitMessage`: Commit message of the github action. Default: `'chore: update contributors'`
- `noCommit`: Changes will not be committed. This options requires a local clone and will updated if required the contributor svg. Default: `false`.

## Examples

### Rounded Avatar

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          round: true
```

<img src="./examples/contributors-rounded-avatar.svg">

### Squared Avatar

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          round: false
```

<img src="./examples/contributors-squared-avatar.svg">

### With UserName

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          userNameHeight: 19
          itemTemplate: >
            <g transform="translate({{ x }}, {{ y }})">
              <a xlink:href="{{{ url }}}" class="contributor-link" target="_blank" rel="nofollow sponsored" title="{{{ name }}}" id="{{{ name }}}">
                <image width="{{ width }}" height="{{ height }}" xlink:href="{{{ avatar }}}" />
                <text x="32" y="74" text-anchor="middle" alignment-baseline="middle" font-size="10">{{{ name }}}</text>
              </a>
            </g>
```

<img src="./examples/contributors-username.svg">

### Only Bots

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          svgTemplate: >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
              width="{{ width }}"
              height="{{ botsHeight }}"
            >
              <style>.contributor-link { cursor: pointer; }</style>
              {{{ bots }}}
            </svg>
```

<img src="./examples/bots.svg">

### Only Collaborators

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          svgTemplate: >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
              width="{{ width }}"
              height="{{ collaboratorsHeight }}"
            >
              <style>.contributor-link { cursor: pointer; }</style>
              {{{ collaborators }}}
            </svg>
```

<img src="./examples/collaborators.svg">

### Contributors And Bots

```yml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          includeBots: false
          svgTemplate: |
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
              width="{{ width }}"
              height="{{#sum}} {{ contributorsHeight }} +  {{ botsHeight }} + 32 + 32 {{/sum}}"
            >
              <style>.contributor-link { cursor: pointer; }</style>

              <text x="5" y="8" text-anchor="start" alignment-baseline="before-edge" font-size="24">Contributors</text>
              <g transform="translate(0, 32)">
                {{{ contributors }}}
              </g>

              <text x="5" y="{{#sum}} {{ contributorsHeight }} + 32 + 8 {{/sum}}" text-anchor="start" alignment-baseline="before-edge" font-size="24">Bots</text>
              <g transform="translate(0, {{#sum}} {{ contributorsHeight }} + 32 + 32 {{/sum}})">
                {{{ bots }}}
              </g>
            </svg>
```

<img src="./examples/contributors-bots.svg">

### Contributors, Bots And Collaborators

```yaml
name: Contributors
on:
  schedule:
    - cron: '0 1 * * 0' # At 01:00 on Sunday.
  push:
    branches:
      - master
jobs:
  contributors:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/contributors-list@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          includeBots: false
          svgTemplate: |
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
              width="{{ width }}"
              height="{{#sum}} {{ contributorsHeight }} + {{ botsHeight }} + {{ collaboratorsHeight }} + 32 + 32 + 32 {{/sum}}"
            >
              <style>.contributor-link { cursor: pointer; }</style>

              <text x="5" y="5" text-anchor="start" alignment-baseline="before-edge" font-size="24">Contributors</text>
              <g transform="translate(0, 32)">
                {{{ contributors }}}
              </g>

              <text x="5" y="{{#sum}} {{ contributorsHeight }} + 32 + 8 {{/sum}}" text-anchor="start" alignment-baseline="before-edge" font-size="24">Bots</text>
              <g transform="translate(0, {{#sum}} {{ contributorsHeight }} + 32 + 32 {{/sum}})">
                {{{ bots }}}
              </g>

              <text x="5" y="{{#sum}} {{ contributorsHeight }} + {{ botsHeight }} + 32 + 32 + 8 {{/sum}}" text-anchor="start" alignment-baseline="before-edge" font-size="24">Collaborators</text>
              <g transform="translate(0, {{#sum}} {{ contributorsHeight }} + {{ botsHeight }} + 32 + 32 + 32 {{/sum}})">
                {{{ collaborators }}}
              </g>
            </svg>
```

<img src="./examples/contributors-bots-collaborators.svg">

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
