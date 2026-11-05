/** The signed-in user, as returned by `GET /api/auth/me` and `POST /api/auth/anonymous`. Every user is a guest for now. */
export type UserDto = {
  id: string;
  name: string;
  created_at: string;
};
