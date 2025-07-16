import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validateBody } from '../middleware/validation';
import { AuthRequest, requireTeacher } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();


// Create Class
const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  schoolId: z.string().optional()
});

router.post('/', requireTeacher, validateBody(createClassSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { name, description, schoolId } = req.body;

  const classRecord = await prisma.class.create({
    data: {
      name,
      description,
      teacherId: req.user!.id,
      schoolId,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      },
      school: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: { class: classRecord },
    timestamp: new Date()
  });
}));

// Get Class by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const classId = req.params.id;

  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      },
      students: {
        include: {
          student: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
              grade: true
            }
          }
        },
        orderBy: {
          student: { firstName: 'asc' }
        }
      },
      school: true
    }
  });

  if (!classRecord) {
    throw createError('Class not found', 404);
  }

  // Check if user has access to this class
  const isTeacher = classRecord.teacherId === req.user?.id;
  const isStudent = classRecord.students.some(s => s.studentId === req.user?.id);

  if (!isTeacher && !isStudent) {
    throw createError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { class: classRecord },
    timestamp: new Date()
  });
}));

// Join Class by Invite Code
const joinClassSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required')
});

router.post('/join', validateBody(joinClassSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { inviteCode } = req.body;

  const classRecord = await prisma.class.findUnique({
    where: { inviteCode },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      }
    }
  });

  if (!classRecord) {
    throw createError('Invalid invite code', 404);
  }

  if (!classRecord.isActive) {
    throw createError('This class is no longer active', 400);
  }

  // Check if already a member
  const existingMembership = await prisma.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId: classRecord.id,
        studentId: req.user!.id
      }
    }
  });

  if (existingMembership) {
    return res.json({
      success: true,
      message: 'Already a member of this class',
      data: { class: classRecord },
      timestamp: new Date()
    });
  }

  // Add student to class
  await prisma.classStudent.create({
    data: {
      classId: classRecord.id,
      studentId: req.user!.id
    }
  });

  res.json({
    success: true,
    message: 'Successfully joined class',
    data: { class: classRecord },
    timestamp: new Date()
  });
}));

// Get User's Classes
router.get('/my/all', asyncHandler(async (req: AuthRequest, res) => {
  let classes;

  if (req.user!.role === 'TEACHER') {
    // Get classes where user is teacher
    classes = await prisma.class.findMany({
      where: { teacherId: req.user!.id },
      include: {
        _count: {
          select: { students: true }
        },
        school: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    // Get classes where user is student
    classes = await prisma.class.findMany({
      where: {
        students: {
          some: { studentId: req.user!.id }
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: { students: true }
        },
        school: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  res.json({
    success: true,
    data: { classes },
    timestamp: new Date()
  });
}));

export default router; 