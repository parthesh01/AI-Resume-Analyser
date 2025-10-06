import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import { usePuterStore } from "~/lib/puter";

export const meta = () => [
  { title: "Resumate | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const resume = () => {
  const { auth, isLoading, kv, fs } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`)
}, [isLoading])


  useEffect(() => {
    const loadResume = async () => {
      try {
        console.log("Loading resume with ID:", id);
        const resume = await kv.get(`resume:${id}`);
        if (!resume) {
          console.error("No resume data found for ID:", id);
          return;
        }

        const data = JSON.parse(resume);
        console.log("Resume data loaded:", data);

        // Load PDF blob
        console.log("Loading PDF from path:", data.resumePath);
        const resumeBlob = await fs.read(data.resumePath);
        if (!resumeBlob) {
          console.error("Failed to read PDF blob from path:", data.resumePath);
          return;
        }

        const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        console.log("PDF URL created:", pdfUrl);
        setResumeUrl(pdfUrl);

        // Load image blob
        console.log("Loading image from path:", data.imagePath);
        const imageBlob = await fs.read(data.imagePath);
        if (!imageBlob) {
          console.error("Failed to read image blob from path:", data.imagePath);
          return;
        }

        const imageUrl = URL.createObjectURL(imageBlob);
        console.log("Image URL created:", imageUrl);
        setImageUrl(imageUrl);

        setFeedback(data.feedback);
        setLoading(false);
        console.log("All data loaded successfully:", {
          pdfUrl,
          imageUrl,
          feedback: data.feedback,
        });
      } catch (error) {
        console.error("Error loading resume:", error);
        setError("Failed to load resume data");
        setLoading(false);
      }
    };
    loadResume();
  }, [id]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span className="text-sm font-semibold text-gray-800">
            Back to Home
          </span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center]">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-white text-lg">Loading resume...</div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 text-lg">{error}</div>
            </div>
          )}
          {!loading && !error && imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-2xl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                />
              </a>
            </div>
          )}
          {!loading && !error && (!imageUrl || !resumeUrl) && (
            <div className="flex items-center justify-center h-full">
              <div className="text-white text-lg">
                Failed to load resume image
              </div>
            </div>
          )}
        </section>
        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback}/>
              <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []}/>
              <Details feedback={feedback}/>
            </div>
          ) : (
            <img src="/images/resume-scan-2.gif" className="w-full" />
          )}
        </section>
      </div>
    </main>
  );
};

export default resume;
