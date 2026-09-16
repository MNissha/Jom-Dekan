import { useSearchParams } from "react-router-dom";
import { TutoringView } from "../components/marketplace/TutoringView";
import { FreelanceView } from "../components/marketplace/FreelanceView";

// This single route serves both sidebar destinations — "Tutoring" links
// here with ?type=TUTORING, "Freelance Opportunities" links here with no
// query param — each rendering its own specialized view over the same
// real opportunities data, rather than needing two separate routes.
export function Marketplace() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "";
  const listingId = searchParams.get("listing");

  return (
    <div className="page-container page-container-standard">
      {type === "TUTORING" ? <TutoringView initialDetailId={listingId} /> : <FreelanceView initialDetailId={listingId} />}
    </div>
  );
}

export default Marketplace;
