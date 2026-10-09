class UserModel {
  final String userName;
  final String email;
  final String role;
  final String status;
  final int? customerId;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? gender;

  const UserModel({
    required this.userName,
    required this.email,
    required this.role,
    this.status = 'active',
    this.customerId,
    this.firstName,
    this.lastName,
    this.phone,
    this.gender,
  });

  String get fullName {
    final fn = firstName ?? '';
    final ln = lastName ?? '';
    final full = '$fn $ln'.trim();
    return full.isNotEmpty ? full : userName;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userName: json['user_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'customer',
      status: json['status'] as String? ?? 'active',
      customerId: json['customer_id'] as int?,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      phone: json['phone'] as String?,
      gender: json['gender'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_name': userName,
      'email': email,
      'role': role,
      'status': status,
      'customer_id': customerId,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      'gender': gender,
    };
  }
}
