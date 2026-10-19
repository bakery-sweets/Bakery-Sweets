class NotificationModel {
  final int notificationId;
  final String userName;
  final String title;
  final String message;
  final String type;
  final int? referenceId;
  final bool isRead;
  final String? createdAt;

  const NotificationModel({
    required this.notificationId,
    required this.userName,
    required this.title,
    required this.message,
    required this.type,
    this.referenceId,
    this.isRead = false,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      notificationId: json['notification_id'] as int? ?? 0,
      userName: json['user_name'] as String? ?? '',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'general',
      referenceId: json['reference_id'] as int?,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: json['created_at']?.toString(),
    );
  }

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      notificationId: notificationId,
      userName: userName,
      title: title,
      message: message,
      type: type,
      referenceId: referenceId,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}
