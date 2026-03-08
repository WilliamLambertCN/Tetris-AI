// User model definition
class User {
    constructor(username, password, email) {
        this.username = username;
        this.email = email;
        // TODO: Add secure password hashing (bcrypt)
        this.passwordHash = password;
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

export default User;
