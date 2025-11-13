import model from '../models/index.js';

const { User, Student, Tutor } = model;

// ✅ Get all users with ID and name based on role
export const getAllUsers = async (role) => {
  const include = [];

  if (role === 'student') {
    include.push({ model: Student, attributes: ['name'] });
  } else if (role === 'tutor') {
    include.push({ model: Tutor, attributes: ['name'] });
  }

  const whereClause = role ? { role } : {};

  const users = await User.findAll({
    where: whereClause,
    include,
    attributes: ['id', 'role'], // only fetch what's needed
  });

  return users.map((user) => ({
    id: user.id,
    name:
      user?.Student?.name ||
      user?.Tutor?.name ||
      'Unnamed User',
  }));
};

// ✅ Create new user
export const newUser = async (body) => {
  const data = await User.create(body);
  return data;
};

// ✅ Update user by ID
export const updateUser = async (id, body) => {
  await User.update(body, {
    where: { id: id }
  });
  return body;
};

// ✅ Delete user by ID
export const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
  return '';
};

// ✅ Get single user by ID
export const getUser = async (id) => {
  const data = await User.findByPk(id);
  return data;
};
