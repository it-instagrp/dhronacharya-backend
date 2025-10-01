// src/routes/sitemap.routes.js
import express from "express";
import db from "../models/index.js"; // your Sequelize models export
import { SitemapStream, streamToPromise } from "sitemap";
import { createGzip } from "zlib";

const router = express.Router();

// ⚙️ Put your static frontend routes here (from App.js)
const staticRoutes = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/home1", changefreq: "daily", priority: 1.0 },
  { url: "/help-center", changefreq: "monthly", priority: 0.8 },
  { url: "/login", changefreq: "weekly", priority: 0.7 },
  { url: "/forgot-password", changefreq: "weekly", priority: 0.7 },
  { url: "/studentreg", changefreq: "weekly", priority: 0.7 },
  { url: "/tutorreg", changefreq: "weekly", priority: 0.7 },
  { url: "/explore-categories", changefreq: "weekly", priority: 0.8 },
  { url: "/explorecategory_home", changefreq: "weekly", priority: 0.8 },
  { url: "/student-plan", changefreq: "monthly", priority: 0.6 },
  { url: "/tutor-plan", changefreq: "monthly", priority: 0.6 },
  { url: "/book-demo", changefreq: "weekly", priority: 0.7 },
  { url: "/find-instructor", changefreq: "weekly", priority: 0.8 },
  { url: "/aboutus", changefreq: "monthly", priority: 0.5 },
  { url: "/contactus", changefreq: "monthly", priority: 0.5 },
  { url: "/Privacypolicy", changefreq: "yearly", priority: 0.4 },
  { url: "/TermsAndConditions", changefreq: "yearly", priority: 0.4 },
  // ...add or remove any other static routes you have in App.js

  // Admin
  { url: "/admin-login", changefreq: "monthly", priority: 0.5 },
  { url: "/admin-registration", changefreq: "monthly", priority: 0.5 },
  { url: "/admin-forgot-password", changefreq: "monthly", priority: 0.5 },
  { url: "/admin-dashboard", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_manage_tutor", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_manage_students", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_subscriptions", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_coupon_offers", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_referral_code", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_send_notifications", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_analysis", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_invoices", changefreq: "weekly", priority: 0.7 },
  { url: "/admin_group_clases", changefreq: "weekly", priority: 0.7 },

  // Tutor
  { url: "/tutor-dashboard", changefreq: "weekly", priority: 0.7 },
  { url: "/tutor-profile", changefreq: "weekly", priority: 0.7 },
  { url: "/tutor-profile-show", changefreq: "weekly", priority: 0.7 },
  { url: "/location-form", changefreq: "monthly", priority: 0.6 },
  { url: "/create-profile-tutor1", changefreq: "monthly", priority: 0.6 },
  { url: "/create-profile-tutor2", changefreq: "monthly", priority: 0.6 },
  { url: "/subscriptionplan_tutor", changefreq: "monthly", priority: 0.6 },
  { url: "/my_classes_tutor_main", changefreq: "weekly", priority: 0.6 },
  { url: "/my_classes_tutor", changefreq: "weekly", priority: 0.6 },
  { url: "/add-class-form-tutor", changefreq: "weekly", priority: 0.6 },
  { url: "/message_tutor", changefreq: "daily", priority: 0.6 },
  { url: "/billing_history_tutor", changefreq: "monthly", priority: 0.6 },
  { url: "/tutor_message", changefreq: "daily", priority: 0.6 },
  { url: "/tutor_invoice", changefreq: "monthly", priority: 0.6 },
  { url: "/view_all_enquires", changefreq: "weekly", priority: 0.6 },
  { url: "/enquiry_list_tutor", changefreq: "weekly", priority: 0.6 },
  { url: "/filter_student", changefreq: "weekly", priority: 0.6 },
  { url: "/findstudent_show", changefreq: "weekly", priority: 0.6 },
  { url: "/refer_tutor", changefreq: "weekly", priority: 0.6 },
  { url: "/referal_signup", changefreq: "weekly", priority: 0.6 },
  { url: "/tutor_referral_code", changefreq: "weekly", priority: 0.6 },
  { url: "/tutor_subscription_plan", changefreq: "monthly", priority: 0.6 },

  // Student
  { url: "/student-dashboard", changefreq: "weekly", priority: 0.7 },
  { url: "/student_classes", changefreq: "weekly", priority: 0.7 },
  { url: "/student_billing_history", changefreq: "monthly", priority: 0.6 },
  { url: "/student_profile_show", changefreq: "weekly", priority: 0.7 },
  { url: "/student_message_dashboard", changefreq: "daily", priority: 0.6 },
  { url: "/student_bookmark", changefreq: "weekly", priority: 0.6 },
  { url: "/student_invoice", changefreq: "monthly", priority: 0.6 },
  { url: "/student_referal", changefreq: "weekly", priority: 0.6 },
  { url: "/my_classes_student", changefreq: "weekly", priority: 0.6 },
  { url: "/whole_profile_student", changefreq: "weekly", priority: 0.6 },
  { url: "/myplanupgrade_student", changefreq: "monthly", priority: 0.6 },
  { url: "/enquiry_form_student", changefreq: "weekly", priority: 0.6 },
  { url: "/subscriptionPlans_student", changefreq: "monthly", priority: 0.6 },
  { url: "/student_referral_code", changefreq: "weekly", priority: 0.6 },
  { url: "/student_subscription_plan", changefreq: "monthly", priority: 0.6 },

];

// simple in-memory cache to avoid rebuilding sitemap on every request
let sitemapCache = null;
let sitemapCacheTime = 0; // ms
const CACHE_TTL = Number(process.env.SITEMAP_CACHE_TTL || 60 * 60); // seconds (default 1 hour)

// GET /sitemap.xml  (gzipped)
router.get("/sitemap.xml", async (req, res) => {
  try {
    // serve cached sitemap if still fresh
    if (sitemapCache && (Date.now() - sitemapCacheTime) < CACHE_TTL * 1000) {
      res.header("Content-Type", "application/xml");
      res.header("Content-Encoding", "gzip");
      return res.send(sitemapCache);
    }

    const hostname = process.env.SITE_HOSTNAME || "https://yourdomain.com";

    // create sitemap stream
    const smStream = new SitemapStream({ hostname });

    // write static routes
    staticRoutes.forEach((r) => smStream.write(r));

    // -----------------------
    // Add dynamic routes here
    // -----------------------
    // Example: Tutor profile pages -> /TutorProfile/:id
    // Make sure your model name is correct (db.Tutor)
    try {
      const tutors = await db.Tutor.findAll({
        attributes: ["id", "updatedAt", "createdAt"],
        where: { profile_status: "approved" }, // optional filter
        raw: true,
      });

      tutors.forEach((t) => {
        const lastmod = t.updatedAt ?? t.updated_at ?? t.createdAt ?? t.created_at;
        smStream.write({
          url: `/TutorProfile/${t.id}`,
          changefreq: "weekly",
          priority: 0.6,
          lastmod: lastmod ? new Date(lastmod).toISOString() : undefined,
        });
      });
    } catch (err) {
      // log but continue — sitemap should still be generated for static routes
      console.error("Error fetching tutors for sitemap:", err);
    }

    // If you want to add other dynamic pages (e.g. classes or public student profiles),
    // query the corresponding models, map to their public URLs, and smStream.write(...) similarly.

    // finalize stream and gzip
    smStream.end();

    const gzippedSitemap = await streamToPromise(smStream.pipe(createGzip()));

    // cache it
    sitemapCache = gzippedSitemap;
    sitemapCacheTime = Date.now();

    // send response
    res.header("Content-Type", "application/xml");
    res.header("Content-Encoding", "gzip");
    res.send(gzippedSitemap);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    res.status(500).end();
  }
});

// Optional: expose robots.txt route that references sitemap
router.get("/robots.txt", (req, res) => {
  const hostname = process.env.SITE_HOSTNAME || "https://yourdomain.com";
  res.type("text/plain");
  res.send(`User-agent: *\nAllow: /\nSitemap: ${hostname}/sitemap.xml\n`);
});

export default router;
