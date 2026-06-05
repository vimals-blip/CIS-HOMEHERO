import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({ meta: [{ title: "HomeHero" }] }),
  component: CmsPage,
});

function CmsPage() {
  const { slug } = Route.useParams();
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ["cms-page", slug],
    queryFn: () => apiFetch(`/cms/pages/${slug}`),
    retry: false,
  });

  if (isLoading) return <div className="container mx-auto px-4 py-16"><LoadingSpinner /></div>;
  if (isError || !page) return <div className="container mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Page not found.</div>;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{page.body}</div>
    </div>
  );
}
