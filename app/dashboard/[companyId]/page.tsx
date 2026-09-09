import { checkCompanyAdmin } from "@/lib/whop-access";
import { listExperiences, listProducts, WhopExperience, WhopProduct } from "@/lib/whop-rest";
import AdminUploader from "@/components/admin-uploader";
import CreateExperienceButton from "@/components/create-experience-button";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const access = await checkCompanyAdmin(companyId);
  if (access.access_level !== "admin") {
    return (
      <main className="shell">
        <div className="card centered">
          <h1>Admin access required</h1>
          <p className="desc">Only ASAFAMZ team members can manage the digital library.</p>
        </div>
      </main>
    );
  }

  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

  const products: WhopProduct[] = await listProducts(companyId);
  const experiences: WhopExperience[] = appId ? await listExperiences(companyId, appId) : [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">ASAFAMZ DIGITAL LIBRARY · ADMIN</div>
        <span className="member-pill">Owner dashboard</span>
      </header>
      <section className="admin-hero">
        <div>
          <div className="eyebrow">Digital product manager</div>
          <h1 className="title small">Your content, delivered securely.</h1>
          <p className="desc">
            Upload a private PDF and connect it to a Whop product. Customers only see it through a
            purchased experience.
          </p>
        </div>
      </section>
      <section className="card">
        <h2>Products</h2>
        <p className="note">
          Choose the product that should deliver the cookbook. Your existing Pure Taste product
          should appear here.
        </p>
        <div className="product-list">
          {products.map((p: WhopProduct) => {
            const exp = experiences.find((e: WhopExperience) =>
              e.products?.some((x) => x.id === p.id),
            );
            return (
              <div className="product-row" key={p.id}>
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted">{p.id}</div>
                </div>
                {exp ? (
                  <AdminUploader companyId={companyId} productId={p.id} />
                ) : (
                  <div className="setup">
                    <span className="muted">Library not attached</span>
                    <CreateExperienceButton companyId={companyId} productId={p.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="card">
        <h2>What happens after setup?</h2>
        <ol className="steps">
          <li>The app creates an Experience View for the product.</li>
          <li>The PDF is stored as a private Whop file.</li>
          <li>The file ID is saved in the product metadata.</li>
          <li>Customers with access receive a fresh signed URL when they open the library.</li>
        </ol>
      </section>
    </main>
  );
}
