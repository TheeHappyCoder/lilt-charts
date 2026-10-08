/** Lightweight, presentational TSX coloring; source text is never interpreted as HTML. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="lilt-code-block">
      <code>
        {code
          .trimEnd()
          .split('\n')
          .map((line, index) => (
            <span className="lilt-code-line" key={index}>
              {line
                .split(
                  /(\/\/.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:import|from|export|function|return|const|interface|type|satisfies|readonly|number|string|null|true|false)\b|\b\d+(?:\.\d+)?\b)/g,
                )
                .map((token, position) => (
                  <span
                    key={position}
                    className={
                      token.startsWith('//')
                        ? 'lilt-code-comment'
                        : /^['"]/.test(token)
                          ? 'lilt-code-string'
                          : /^(import|from|export|function|return|const|interface|type|satisfies|readonly|number|string|null|true|false)$/.test(
                                token,
                              )
                            ? 'lilt-code-keyword'
                            : /^\d/.test(token)
                              ? 'lilt-code-number'
                              : undefined
                    }
                  >
                    {token}
                  </span>
                ))}
              {'\n'}
            </span>
          ))}
      </code>
    </pre>
  );
}
