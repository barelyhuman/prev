// import { styled } from 'goober'
import { useState } from 'preact/hooks'

// const Button = styled('button')`
//   background: #181819;
//   color: #fff;
//   min-height: 32px;
//   padding-left: 20px;
//   padding-right: 20px;
//   border-radius: 6px;

//   &:hover {
//     background: #333;
//   }
// `

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={_ => setCount(count + 1)}>{count}</button>
}
