import { repositoryFromYaml } from "./Repository"

const repoYaml = `
A@0.0.1: {}
B@0.0.1:
  A: =0.0.1
C@0.0.1:
  A: =0.0.1
  B: =0.0.1


`

describe('parse yaml repo', () => {
  test('parsing', () => {
    const repo = repositoryFromYaml(repoYaml)

    expect(repo).toBeTruthy()
  })
})