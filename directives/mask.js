/*
** Derived from:
** https://github.com/beholdr/maska
** https://github.com/vuejs-tips/vue-the-mask
 */

const tokens = {
  '#': { pattern: /\d/ },
  X: { pattern: /[0-9a-zA-Z]/ },
  S: { pattern: /[a-zA-Z]/ },
  A: { pattern: /[a-zA-Z]/, transform: v => String(v).toUpperCase() },
  a: { pattern: /[a-zA-Z]/, transform: v => String(v).toLowerCase() },
  '!': { escape: true },
  '+': { repeat: true }
}

/**
 * Get input
 *
 * @param {HTMLElement} el
 *
 * @returns {HTMLInputElement}
 */
const getInput = (el) => {
  const [
    input,
    ...inputs
  ] = el.querySelectorAll('input[id]')

  if (inputs.length > 0) {
    throw new Error('Multiple input elements found')
  }

  if (!input) {
    throw new Error('No input found')
  }

  return input
}

/**
 * On input
 *
 * @param {HTMLInputElement} target
 */
const onInput = ({ target }) => {
  let caret = target.selectionEnd

  const oldValue = target.value
  const lastChar = oldValue.charAt(caret - 1)

  target.value = computeValue(target.value, target.dataset.mask)

  while (caret < target.value.length && target.value.charAt(caret - 1) !== lastChar) {
    caret++
  }

  if (target === document.activeElement) {
    target.setSelectionRange(caret, caret)

    setTimeout(() => {
      target.setSelectionRange(caret, caret)
    })
  }

  if (target.value !== oldValue) {
    target.dispatchEvent(new InputEvent('input'))
  }
}

/**
 * Compute value
 *
 * @param {string} value
 * @param {string} mask
 * @param {boolean} [masked = true]
 *
 * @returns {string}
 */
const computeValue = (value, mask, masked = true) => {
  let maskIndex = 0
  let valueIndex = 0
  let output = ''
  let rest = ''

  while (maskIndex < mask.length && valueIndex < value.length) {
    let maskChar = mask[maskIndex]

    const valueChar = value[valueIndex]
    const token = tokens[maskChar]

    if (token?.pattern) {
      if (token.pattern.test(valueChar)) {
        output += token.transform
          ? token.transform(valueChar)
          : valueChar

        maskIndex++

        if (masked && mask[maskIndex] && !tokens[mask[maskIndex]]) {
          output += mask[maskIndex]

          maskIndex++
        }
      }

      valueIndex++
    } else if (token?.repeat) {
      const prevToken = tokens[mask[maskIndex - 1]]

      if (prevToken && !prevToken.pattern.test(valueChar)) {
        maskIndex++
      } else {
        maskIndex--
      }
    } else {
      if (token?.escape) {
        maskIndex++

        maskChar = mask[maskIndex]
      }

      if (masked) {
        output += maskChar
      }

      if (valueChar === maskChar) {
        valueIndex++
      }

      maskIndex++
    }
  }

  if (masked) {
    while (maskIndex < mask.length) {
      const maskCharRest = mask[maskIndex]

      if (tokens[maskCharRest]) {
        rest = ''
        break
      }

      rest += maskCharRest

      maskIndex++
    }
  }

  return output + rest
}

export const mask = {
  bind (el, { value }) {
    const input = getInput(el)

    if (value) {
      input.dataset.mask = value

      input.addEventListener('input', onInput)

      if (input.value) {
        input.dispatchEvent(new InputEvent('input'))
      }
    }
  },

  update (el, {
    value,
    oldValue
  }) {
    if (value !== oldValue) {
      const input = getInput(el)

      if (value) {
        input.dataset.mask = value

        input.addEventListener('input', onInput)

        if (input.value) {
          input.dispatchEvent(new InputEvent('input'))
        }
      } else {
        delete input.dataset.mask

        input.removeEventListener('input', onInput)
      }
    }
  },

  unbind (el) {
    const input = getInput(el)

    delete input.dataset.mask

    input.removeEventListener('input', onInput)
  }
}
