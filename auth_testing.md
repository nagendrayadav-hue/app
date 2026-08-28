## AUTH TESTING PLAYBOOK

Step 1: MongoDB Verification
- db.users.findOne({role:"admin"}) — bcrypt hash starts with $2b$

Step 2: API Testing (Bearer token, stored client-side)
curl -X POST $URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"ranger@biodash.app","password":"wildlife123"}'
-> returns {token, user}
curl $URL/api/auth/me -H "Authorization: Bearer <token>" -> returns user
