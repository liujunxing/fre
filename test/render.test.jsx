/** @jsx h */

import { h, render, useState, useEffect, useRef } from "../src/index"

const testRender = jsx => new Promise(resolve => {
  document.body.innerHTML = ""

  render(jsx, document.body, () => resolve([...document.body.childNodes]))
})

const toString = elements => elements.map(child => child.outerHTML).join("")

test('render nested HTML elements, apply attributes', async () => {
  const elements = await testRender(<div><span class="foo">test</span></div>)

  expect(toString(elements)).toBe(`<div><span class="foo">test</span></div>`)
})

test('apply props to object properties', async () => {
  const elements = await testRender(<input defaultChecked={true}/>)

  expect(elements[0].defaultChecked).toBe(true)
})

test('render range of HTML elements', async () => {
  const elements = await testRender(<ul><li>1</li><li>2</li><li>3</li></ul>)

  expect(toString(elements)).toBe("<ul><li>1</li><li>2</li><li>3</li></ul>")
})

test('attach DOM event handler', async () => {
  let clicked = false

  const handler = () => clicked = true

  const elements = await testRender(<button onclick={handler}>OK</button>)

  elements[0].click()

  expect(clicked).toBe(true)
})

test('update components; use state and effect hooks', async done => {
  const Component = ({ effect }) => {
    const [count, setCount] = useState(0)

    useEffect(effect)

    const onClick = () => setCount(count + 1)

    return (
      <button onclick={onClick}>
        {count}
      </button>
    )
  }

  let effectCalled = false

  let afterEffect = () => effectCalled = true

  let elements = await testRender(<Component effect={() => afterEffect()}/>)

  expect(effectCalled).toBe(true)

  expect(elements[0].firstChild.nodeValue).toBe("0")

  afterEffect = checkEffect

  elements[0].click()

  function checkEffect() {
    expect(elements[0].firstChild.nodeValue).toBe("1")

    done()
  }
})

test('obtain reference to DOM element', async () => {
  const Component = () => {
    const ref = useRef()

    useEffect(() => expect(ref.current.name).toBe("foo"))

    return <input name="foo" ref={ref}/>
  }

  await testRender(<Component/>)
})

test('reorder elements using key-based diff', done => {
  const initialState = [1,2,3]

  const states = [
    [3,1,2], // shift right
    [2,3,1], // shift left
    [1,3],   // remove from middle
    [2,3],   // remove first
    [1,2],   // remove last
    [3,2,1], // reverse order
  ]

  let update

  const Component = ({initialState}) => {
    const [state, setState] = useState(initialState)

    const afterEffect = new Promise(resolve => useEffect(resolve))

    update = newState => {
      setState(newState)

      return afterEffect
    }

    return (
      <ul>
        {state.map(value => <li key={value}>{value}</li>)}
      </ul>
    )
  }

  let promise = testRender(<Component initialState={initialState}/>)

  for (const state of states) {
    promise = promise.then(() => {
      return update(state).then(() => {
        const ul = document.body.children[0]

        // TODO preserve and check element references for identity between updates

        console.log("target state: ", state, [...ul.children].map(child => child.textContent))

        expect(ul.children.length).toBe(state.length)

        state.map((value, index) => {
          expect(ul.children[index].textContent).toBe("" + value)
        })

        return update(initialState).then(() => {
          const ul = document.body.children[0]

          expect(ul.children[0].textContent).toBe("" + initialState[0])
          expect(ul.children[1].textContent).toBe("" + initialState[1])
          expect(ul.children[2].textContent).toBe("" + initialState[2])
        })
      })
    })
  }

  promise.then(done)
})
