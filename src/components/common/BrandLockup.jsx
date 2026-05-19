import { PRODUCT_NAME } from "../../lib/constants";

export function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-dot" aria-hidden="true" />
      <span>
        <strong>{PRODUCT_NAME}</strong>
        <span>Roblox AI builder</span>
      </span>
    </div>
  );
}
