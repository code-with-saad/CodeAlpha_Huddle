import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renders user markdown. react-markdown never renders raw HTML, so pasted tags show as text.
// @username becomes a chip when that person is a member of the project.
export default function Markdown({ text, usernames }) {
  const source = usernames?.size
    ? text.replace(/(^|[^a-z0-9_])@([a-z0-9_]{3,20})/gi, (m, pre, name) => (usernames.has(name.toLowerCase()) ? `${pre}[@${name}](#mention-${name.toLowerCase()})` : m))
    : text;
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith('#mention-') ? (
              <span className="mention">{children}</span>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            ),
          // Images inside user text are not loaded from arbitrary hosts (also blocked by the CSP); show a link.
          img: ({ src, alt }) => (
            <a href={src} target="_blank" rel="noopener noreferrer nofollow">
              {alt || src}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
