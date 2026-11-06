import { useSearchParams } from "../../../src";

/** A page number kept in the address */
const SearchParamsScenario = () => {
  const [searchParams, setSearchParams] = useSearchParams({ page: "1" });
  const page = searchParams.get("page");

  return (
    <>
      {/* Status */}
      <p>Page {page}</p>

      {/* Change it, adding an entry or in place */}
      <button type="button" onClick={() => setSearchParams({ page: "2" })}>
        Next page
      </button>
      <button
        type="button"
        onClick={() => setSearchParams({ page: "3" }, { replace: true })}
      >
        Jump in place
      </button>
    </>
  );
};

export { SearchParamsScenario };
