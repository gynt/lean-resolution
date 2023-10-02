import React, { useState } from 'react';

import logo from './logo.svg';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container, Form } from 'react-bootstrap';
import { atom, useAtom, useAtomValue } from 'jotai';
import { parse, stringify } from 'yaml';
import { repositoryFromYaml, solve } from 'lean-resolution';

const rawContentAtom = atom<string>(`A@0.0.1: {}
B@0.0.1:
  A: "=0.0.1"
`);

type ParseResult = {
  status: 'ok' | 'error' | 'no-content';
  message: string;
  content: unknown;
}

const yamlParseResultAtom = atom<ParseResult>((get) => {
  const rawContent = get(rawContentAtom);
  if (rawContent === '') {
    return {
      status: 'no-content',
      message: '',
      content: undefined,
    } as ParseResult
  }

  try {
    const yamlContent = parse(rawContent)

    return {
      status: 'ok',
      message: 'not implemented',
      content: yamlContent,
    } as ParseResult
  } catch(e) {
    return {
      status: 'error',
      message: (e as Object).toString(),
      content: undefined,
    } as ParseResult
  }

});

const selectedSolveOptionAtom = atom('');

type SolutionResult = {
  status: 'ok' | 'error' | 'no-content';
  message: string;
  content: string[];
}

const solutionAtom = atom<SolutionResult>((get) => {
  const result = get(yamlParseResultAtom)
  if (result.status !== 'ok' || get(selectedSolveOptionAtom) === '') return {status: 'no-content', content: [], message: ''} as SolutionResult

  const {content} = result

  try{
    console.log(`Solving: `, stringify(content))
    const solution = solve(stringify(content), [get(selectedSolveOptionAtom)])
    return {status: 'ok', content: solution.map((n) => n.id), message: ''} as SolutionResult
  }
  catch (e) {
    return {status: 'error', content: [], message: (e as Object).toString()} as SolutionResult
  }
    
})

function App() {

  const [rawContent, setRawContent] = useAtom(rawContentAtom)
  const yamlParseResult = useAtomValue(yamlParseResultAtom);

  const parsedCount = yamlParseResult.status === 'ok' ? Object.keys(yamlParseResult.content as {}).length : '0';
  const statusMessage = yamlParseResult.status === 'error' ? `Error ocurred: ${yamlParseResult.message}` : undefined;
  const parsedCountMessage = `Parsed ${parsedCount} packages`;

  const finalMessage = statusMessage ? statusMessage : parsedCountMessage

  const {content} = yamlParseResult 

  const packageNames = statusMessage === undefined ? Object.keys(content as {}) : []
  const solveOptions = packageNames.map((n) => {
    return (
      <option key={`option-${n}`} value={n}>{n}</option>
    )
  })

  const [selectedSolveOption, setSelectedSolveOption] = useAtom(selectedSolveOptionAtom)

  const solutionResult = useAtomValue(solutionAtom)

  const solutionMessage = solutionResult.status === 'ok' ? solutionResult.content.join('\n') : solutionResult.message

  return (
    <Container className="col-12">
      <div className="row">
        <div className='col-6 d-flex flex-column text-light'>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Repository (YAML)</Form.Label>
              <Form.Control className='bg-dark text-light' as="textarea" rows={30} value={rawContent} onChange={(event) => {
                setRawContent(event.target.value)
              }} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Parse status</Form.Label>
              <Form.Control disabled className='bg-dark text-light' as="textarea" rows={1} value={finalMessage} />
            </Form.Group>
          </Form>
        </div>
        <div className='col-6 d-flex flex-column text-light'>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Solve for: </Form.Label>
              <Form.Select className='bg-dark text-light' value={selectedSolveOption} onChange={(event) => {
                setSelectedSolveOption(event.target.value)
              }}>
                {solveOptions}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Solution</Form.Label>
              <Form.Control className='bg-dark text-light' as="textarea" rows={30} readOnly value={solutionMessage} />
            </Form.Group>
          </Form>
        </div>
      </div>
    </Container>
  );
}

export default App;
