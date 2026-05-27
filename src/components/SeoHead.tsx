import { Helmet } from "react-helmet-async";

const BASE_URL = "https://daily-dominator-tool.lovable.app";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export const SeoHead = ({ title, description, path, noindex }: SeoHeadProps) => {
  const url = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};
