import {
  LocationStateDefaultsProvider,
  useLocationPopup,
  useLocationToggle,
} from "../../../src";

/** A stand-in for a UI library popup that passes extra details on change */
const Popup = ({ label }: { label: string }) => {
  const { open, onOpenChange } = useLocationPopup(label);

  /* Details the library passes along, which the hook must ignore */
  const details = { reason: "trigger-press", replace: true };

  return (
    <div>
      {/* Status */}
      <p>
        {label} {open ? "open" : "closed"}
      </p>

      {/* Trigger and close */}
      <button type="button" onClick={() => onOpenChange(true)}>
        Open {label}
      </button>
      <button
        type="button"
        onClick={() =>
          (onOpenChange as (open: boolean, extra: unknown) => void)(
            false,
            details,
          )
        }
      >
        Close {label}
      </button>
    </div>
  );
};

/** A dialog in a section where nothing survives a reload */
const SectionDialog = () => {
  const [isOpen, setOpen] = useLocationToggle("section-dialog");

  return (
    <>
      {/* Status */}
      <p>{isOpen ? "Section dialog open" : "Section dialog closed"}</p>

      {/* Open */}
      <button type="button" onClick={() => setOpen(true)}>
        Open section dialog
      </button>
    </>
  );
};

/** Two popups of one kind on the page, and a non-persistent section */
const PopupScenario = () => (
  <>
    {/* Popups */}
    <Popup label="Menu A" />
    <Popup label="Menu B" />

    {/* Non-persistent section */}
    <LocationStateDefaultsProvider persist={false}>
      <SectionDialog />
    </LocationStateDefaultsProvider>
  </>
);

export { PopupScenario };
