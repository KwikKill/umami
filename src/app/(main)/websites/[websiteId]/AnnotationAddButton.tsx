import { useMessages } from '@/components/hooks';
import { Flag } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';
import { AnnotationEditForm } from './AnnotationEditForm';

export function AnnotationAddButton({ websiteId }: { websiteId: string }) {
  const { t, labels } = useMessages();

  return (
    <DialogButton icon={<Flag />} label={t(labels.addAnnotation)} width="500px">
      {({ close }) => {
        return <AnnotationEditForm websiteId={websiteId} onClose={close} />;
      }}
    </DialogButton>
  );
}
