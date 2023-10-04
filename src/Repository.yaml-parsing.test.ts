import { solve } from "."
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

const repo2Yaml = `
A@0.0.1: {}
B@0.0.1:
  A: "=0.0.1"
B@0.0.2:
  A: "=0.0.1"
B@0.0.3:
  A: ">=0.0.1"
C@0.0.1:
  B: "=0.0.1"
C@0.0.2:
  B: "=0.0.2"
C@0.0.3:
  B: "=0.0.1"
D@0.0.1:
  B: "=0.0.2"
  C: ">=0.0.2" 
  
`

describe('solve yaml repo', () => {
  test('solving', () => {
    const repo = repositoryFromYaml(repo2Yaml)

    expect(() => solve(repo2Yaml, ['D@0.0.1'])).toBeTruthy();
  })
}) 