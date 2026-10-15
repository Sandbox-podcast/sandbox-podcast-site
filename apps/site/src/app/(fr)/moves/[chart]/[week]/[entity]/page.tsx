import MoveScreen, {
  generateMetadata as moveMetadata,
  generateStaticParams as moveStaticParams,
} from '@/components/move-screen';

type Props = Pick<Parameters<typeof MoveScreen>[0], 'params'>;

export const dynamicParams = false;

export function generateStaticParams() {
  return moveStaticParams();
}

export function generateMetadata(props: Props) {
  return moveMetadata(props);
}

export default function MovePage(props: Props) {
  return MoveScreen(props);
}
