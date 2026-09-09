import { checkExperienceAccess } from "@/lib/whop-access";
import { FILE_METADATA_KEY, productDefaults } from "@/lib/catalog";
import { retrieveWhopFile, whopsdk } from "@/lib/whop-sdk";

export default async function ExperiencePage({ params }: { params: Promise<{ experienceId: string }> }) {
  const { experienceId } = await params;

  try {
    const access = await checkExperienceAccess(experienceId);
    if (!access.has_access) {
      return <main className="shell"><div className="card centered"><div className="lock">🔒</div><h1>Access required</h1><p className="desc">Purchase the product connected to this library to access the cookbook.</p></div></main>;
    }

    const experience = await whopsdk.experiences.retrieve(experienceId);
    const productId = experience.products?.[0]?.id;
    let title = productDefaults.title;
    let description = productDefaults.description;
    let fileUrl: string | null = null;

    if (productId) {
      const product = await whopsdk.products.retrieve(productId);
      title = product.title || title;
      description = product.description || description;
      const fileId = product.metadata?.[FILE_METADATA_KEY] as string | undefined;
      if (fileId) {
        const file = await retrieveWhopFile(fileId);
        if (file.upload_status === "ready" && file.url) fileUrl = file.url;
      }
    }

    return (
      <main className="shell">
        <header className="topbar"><div className="brand">ASAFAMZ DIGITAL LIBRARY</div><span className="member-pill">Member access</span></header>
        <section className="hero">
          <div className="cover"><img src={productDefaults.coverUrl} alt="" /></div>
          <div>
            <div className="eyebrow">Your digital cookbook</div>
            <h1 className="title">{title}</h1>
            <p className="desc">{description}</p>
            {fileUrl ? <div className="actions"><a className="btn" href="#reader">Read cookbook</a><a className="btn secondary" href={fileUrl} target="_blank" rel="noreferrer">Download PDF</a></div> : <div className="notice">Your cookbook file is being prepared. Please check back shortly.</div>}
          </div>
        </section>
        {fileUrl && <section id="reader" className="reader-card"><div className="reader-head"><div><div className="eyebrow">Read online</div><h2>Pure Taste</h2></div><a className="text-link" href={fileUrl} target="_blank" rel="noreferrer">Open PDF ↗</a></div><iframe className="reader" src={fileUrl} title={title} /></section>}
        <footer className="footer">© ASAFAMZ · Digital Library</footer>
      </main>
    );
  } catch {
    return <main className="shell"><div className="card centered"><div className="lock">⚠️</div><h1>Library unavailable</h1><p className="desc">We couldn't verify your Whop access right now. Please refresh the page or contact support.</p></div></main>;
  }
}
