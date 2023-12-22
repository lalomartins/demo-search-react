import { createContext, useContext, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const url = "https://en.wikipedia.org/w/api.php";

class SearchResultPage {
  constructor(data) {
    Object.assign(this, data);
  }

  link() {
    return `http://en.wikipedia.org/?curid=${this.pageid}`;
  }
}

export class SearchOperation {
  constructor(params, suspense) {
    this.searchstring = params.get("q");
    this.options = {
      srqiprofile: params.get("srqiprofile"),
    };
    this._suspense = suspense ?? {
      status: "pending",
      suspender: null,
    };
  }

  // integrate with Suspense
  results() {
    switch (this._suspense.status) {
      case "pending":
        throw this._suspense.suspender;

      case "error":
        throw this._suspense.results;

      default:
        return this._suspense.results;
    }
  }

  get ready() {
    return this._suspense.status === "success";
  }

  _fetch() {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: this.searchstring,
      format: "json",
      srqiprofile: "engine_autoselect",
      origin: "*",
    });
    this._suspense = {
      status: "pending",
      suspender: fetch(`${url}?${params}`)
        .then((response) => response.json())
        .then((response) => {
          return (this._suspense = {
            status: "success",
            results: {
              ...response,
              query: {
                ...response.query,
                search: response.query.search.map(
                  (item) => new SearchResultPage(item)
                ),
              },
            },
          });
        })
        .catch((error) => {
          console.log(error);
          this._suspense = {
            status: "error",
            results: error,
          };
        }),
    };
    return this;
  }
}

export const SearchContext = createContext(null);

export function useSearchResults() {
  const search = useContext(SearchContext);
  return search.results();
}

export function SearchLogic({ children }) {
  let [searchParams, _setSearchParams] = useSearchParams();
  const search = useMemo(
    () => new SearchOperation(searchParams)._fetch(),
    [searchParams]
  );

  return (
    <SearchContext.Provider value={search}>{children}</SearchContext.Provider>
  );
}
