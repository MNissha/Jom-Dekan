import { Router } from "express";
import { taxonomyController } from "../controllers/taxonomyController";
import { validate } from "../config/middleware/validateMiddleware";
import { authenticate } from "../config/middleware/authMiddleware";
import { authorize } from "../config/middleware/authorizeMiddleware";
import {
  idParamSchema,
  statusSchema,
  createUniversitySchema,
  updateUniversitySchema,
  createFacultySchema,
  updateFacultySchema,
  listFacultiesQuerySchema,
  createProgrammeSchema,
  updateProgrammeSchema,
  listProgrammesQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  listSubjectsQuerySchema,
  findOrCreateSubjectSchema,
  linkProgrammeSubjectSchema,
  unlinkProgrammeSubjectParamsSchema,
  createTaxonomyRequestSchema,
} from "../validators/taxonomyValidators";

const router = Router();

// Every write route below requires authenticate + authorize('ADMIN').
// Most read routes require authenticate (any logged-in role) — this app
// has no anonymous/public browsing yet. Universities are the one
// exception: the registration form needs the list before the visitor has
// an account, so listing universities is intentionally public.

/**
 * @openapi
 * /taxonomy/universities:
 *   get:
 *     tags: [Taxonomy]
 *     summary: List universities (public — needed by the registration form, before login)
 *     responses:
 *       200: { description: List of universities }
 *   post:
 *     tags: [Taxonomy]
 *     summary: Create a university (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 *       403: { description: Not an admin }
 */
router.get("/universities", taxonomyController.listUniversities);
router.post(
  "/universities",
  authenticate,
  authorize("ADMIN"),
  validate({ body: createUniversitySchema }),
  taxonomyController.createUniversity,
);
router.put(
  "/universities/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: updateUniversitySchema }),
  taxonomyController.updateUniversity,
);
router.patch(
  "/universities/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: statusSchema }),
  taxonomyController.setUniversityStatus,
);

/**
 * @openapi
 * /taxonomy/faculties:
 *   get:
 *     tags: [Taxonomy]
 *     summary: List faculties for a university
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: universityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of faculties }
 */
router.get(
  "/faculties",
  authenticate,
  validate({ query: listFacultiesQuerySchema }),
  taxonomyController.listFaculties,
);
router.post(
  "/faculties",
  authenticate,
  authorize("ADMIN"),
  validate({ body: createFacultySchema }),
  taxonomyController.createFaculty,
);
router.put(
  "/faculties/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: updateFacultySchema }),
  taxonomyController.updateFaculty,
);
router.patch(
  "/faculties/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: statusSchema }),
  taxonomyController.setFacultyStatus,
);

/**
 * @openapi
 * /taxonomy/programmes:
 *   get:
 *     tags: [Taxonomy]
 *     summary: List programmes for a faculty
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: facultyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of programmes }
 */
router.get(
  "/programmes",
  authenticate,
  validate({ query: listProgrammesQuerySchema }),
  taxonomyController.listProgrammes,
);
router.post(
  "/programmes",
  authenticate,
  authorize("ADMIN"),
  validate({ body: createProgrammeSchema }),
  taxonomyController.createProgramme,
);
router.put(
  "/programmes/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: updateProgrammeSchema }),
  taxonomyController.updateProgramme,
);
router.patch(
  "/programmes/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: statusSchema }),
  taxonomyController.setProgrammeStatus,
);

/**
 * @openapi
 * /taxonomy/subjects:
 *   get:
 *     tags: [Taxonomy]
 *     summary: List subjects, optionally scoped to a programme
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: programmeId
 *         required: false
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of subjects }
 */
router.get(
  "/subjects",
  authenticate,
  validate({ query: listSubjectsQuerySchema }),
  taxonomyController.listSubjects,
);
router.post(
  "/subjects",
  authenticate,
  authorize("ADMIN"),
  validate({ body: createSubjectSchema }),
  taxonomyController.createSubject,
);
router.put(
  "/subjects/:id",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: updateSubjectSchema }),
  taxonomyController.updateSubject,
);
router.patch(
  "/subjects/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: statusSchema }),
  taxonomyController.setSubjectStatus,
);

/**
 * @openapi
 * /taxonomy/programmes/{id}/subjects/find-or-create:
 *   post:
 *     tags: [Taxonomy]
 *     summary: >
 *       Resolve a subject by code for this programme (any authenticated
 *       user) — reuses a matching subject if one exists, otherwise
 *       creates a COMMUNITY_SUBMITTED one and links it to the programme.
 *       Used by the resource-upload flow so a student can name a subject
 *       that isn't in the catalogue yet.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Matched an existing subject }
 *       201: { description: Created a new subject }
 */
router.post(
  "/programmes/:id/subjects/find-or-create",
  authenticate,
  validate({ params: idParamSchema, body: findOrCreateSubjectSchema }),
  taxonomyController.findOrCreateSubject,
);

/**
 * @openapi
 * /taxonomy/programmes/{id}/subjects:
 *   post:
 *     tags: [Taxonomy]
 *     summary: Link a subject to a programme (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Linked }
 * /taxonomy/programmes/{id}/subjects/{subjectId}:
 *   delete:
 *     tags: [Taxonomy]
 *     summary: Unlink a subject from a programme (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unlinked }
 */
router.post(
  "/programmes/:id/subjects",
  authenticate,
  authorize("ADMIN"),
  validate({ params: idParamSchema, body: linkProgrammeSubjectSchema }),
  taxonomyController.linkProgrammeSubject,
);
router.delete(
  "/programmes/:id/subjects/:subjectId",
  authenticate,
  authorize("ADMIN"),
  validate({ params: unlinkProgrammeSubjectParamsSchema }),
  taxonomyController.unlinkProgrammeSubject,
);

/**
 * @openapi
 * /taxonomy/requests:
 *   post:
 *     tags: [Taxonomy]
 *     summary: >
 *       Request a missing university, faculty, and/or programme (any
 *       authenticated user). Unlike subjects/find-or-create, this never
 *       creates the row immediately — universities and programmes still
 *       require ADMIN — it just records the request and notifies admins.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Request submitted }
 *   get:
 *     tags: [Taxonomy]
 *     summary: List the current user's own submitted taxonomy requests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of the caller's requests }
 */
router.post(
  "/requests",
  authenticate,
  validate({ body: createTaxonomyRequestSchema }),
  taxonomyController.createTaxonomyRequest,
);
router.get(
  "/requests/mine",
  authenticate,
  taxonomyController.listMyTaxonomyRequests,
);

export default router;
