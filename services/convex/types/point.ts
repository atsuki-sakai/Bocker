import { Doc, Id } from '@/convex/_generated/dataModel';

type PointConfig = Doc<'point_config'>;

export type PointConfigInput = Partial<
  Omit<Doc<'point_config'>, 'isArchive' | 'deletedAt' | '_creationTime'>
> & {
  salonId: Id<'salon'>;
};
