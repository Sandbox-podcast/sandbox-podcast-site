import SearchScreen, { metadata as searchMetadata } from '@/components/search-screen';

export const dynamic = 'force-dynamic';
export const metadata = searchMetadata;

export default function SearchPage(
  props: Pick<Parameters<typeof SearchScreen>[0], 'searchParams'>,
) {
  return SearchScreen(props);
}
