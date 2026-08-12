// Safe arithmetic expression evaluator for the in-app calculator.
//
// Replaces the previous `new Function('return ' + calcInput)()` pattern, which executed
// arbitrary JavaScript built from calculator input. The calculator's own buttons only ever
// produce digits, '.', '+', '-', '*', '/', so this evaluator supports exactly that grammar
// (plus parentheses, for forward-compatibility) via a small recursive-descent parser -
// no eval, no Function constructor, no arbitrary code execution.
//
// Throws an Error for anything invalid (unexpected character, malformed expression, division
// by zero), which callers should catch and surface as 'Error' the same way the previous
// implementation did.

const ALLOWED_CHARS = /^[0-9+\-*/.() \t]*$/;

function tokenize(input) {
  if (!ALLOWED_CHARS.test(input)) {
    throw new Error('Invalid character in expression');
  }
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if ('+-*/()'.includes(c)) {
      tokens.push({ type: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let seenDot = false;
      while (j < input.length && /[0-9.]/.test(input[j])) {
        if (input[j] === '.') {
          if (seenDot) throw new Error('Malformed number');
          seenDot = true;
        }
        j++;
      }
      const numStr = input.slice(i, j);
      const num = parseFloat(numStr);
      if (Number.isNaN(num)) throw new Error('Malformed number');
      tokens.push({ type: 'num', value: num });
      i = j;
      continue;
    }
    throw new Error('Invalid character in expression');
  }
  return tokens;
}

// Grammar:
//   expr   := term (('+' | '-') term)*
//   term   := unary (('*' | '/') unary)*
//   unary  := '-' unary | primary
//   primary:= num | '(' expr ')'
function parse(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }
  function consume(type) {
    const t = tokens[pos];
    if (!t || t.type !== type) {
      throw new Error(`Expected '${type}'`);
    }
    pos++;
    return t;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'num') {
      pos++;
      return t.value;
    }
    if (t.type === '(') {
      pos++;
      const value = parseExpr();
      consume(')');
      return value;
    }
    throw new Error('Unexpected token');
  }

  function parseUnary() {
    if (peek() && peek().type === '-') {
      pos++;
      return -parseUnary();
    }
    if (peek() && peek().type === '+') {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() && (peek().type === '*' || peek().type === '/')) {
      const op = consume(peek().type).type;
      const rhs = parseUnary();
      if (op === '*') {
        value *= rhs;
      } else {
        if (rhs === 0) throw new Error('Division by zero');
        value /= rhs;
      }
    }
    return value;
  }

  function parseExpr() {
    let value = parseTerm();
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = consume(peek().type).type;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new Error('Unexpected trailing tokens');
  }
  return result;
}

export function evaluateExpression(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('Empty expression');
  }
  const tokens = tokenize(input);
  const result = parse(tokens);
  if (!Number.isFinite(result)) {
    throw new Error('Invalid result');
  }
  return result;
}
