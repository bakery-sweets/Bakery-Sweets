import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';

/// Một kết nối WebSocket tới trung tâm realtime (dùng chung với Web).
/// Có token => nhận thêm sự kiện riêng của tài khoản; không token => chỉ nhận sự kiện công khai.
class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  String? _token;
  bool _active = false;
  bool _connecting = false;
  int _attempt = 0; // Mỗi lần kết nối có số thứ tự riêng, lần cũ hơn thì bỏ kết quả

  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;

  bool get isConnected => _socket != null && _socket!.readyState == WebSocket.open;

  void connect({String? token}) {
    if (_active && _token == token && (isConnected || _connecting)) return;
    _token = token;
    _active = true;
    _reconnectTimer?.cancel();
    _connectInternal();
  }

  Future<void> _connectInternal() async {
    if (!_active) return;
    final attempt = ++_attempt;
    final token = _token;
    _connecting = true;

    try {
      _cleanupSocket();
      final base = AppConfig.wsRealtimeUrl;
      final url = token == null ? base : '$base?token=${Uri.encodeQueryComponent(token)}';
      if (kDebugMode) {
        debugPrint('[WebSocket] Connecting to $base (${token == null ? 'khách vãng lai' : 'có token'})');
      }

      final socket = await WebSocket.connect(url).timeout(const Duration(seconds: 8));
      // Trong lúc chờ, phiên đăng nhập có thể đã đổi và một lần kết nối mới đã bắt đầu
      if (attempt != _attempt || !_active) {
        socket.close();
        return;
      }
      _socket = socket;

      if (kDebugMode) {
        debugPrint('[WebSocket] Connected');
      }

      _startPing();

      socket.listen(
        (data) {
          try {
            final jsonMap = jsonDecode(data.toString()) as Map<String, dynamic>;
            if (jsonMap['type'] != 'pong') {
              _messageController.add(jsonMap);
            }
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[WebSocket] Decode error: $e');
            }
          }
        },
        onError: (err) {
          if (kDebugMode) {
            debugPrint('[WebSocket] Error: $err');
          }
          if (identical(_socket, socket)) _scheduleReconnect();
        },
        onDone: () {
          if (kDebugMode) {
            debugPrint('[WebSocket] Connection closed (code ${socket.closeCode})');
          }
          if (identical(_socket, socket)) _scheduleReconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WebSocket] Connect failed: $e');
      }
      if (attempt == _attempt) _scheduleReconnect();
    } finally {
      if (attempt == _attempt) _connecting = false;
    }
  }

  void _startPing() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (isConnected) {
        try {
          _socket!.add(jsonEncode({'type': 'ping'}));
        } catch (_) {}
      }
    });
  }

  void _scheduleReconnect() {
    _cleanupSocket();
    if (!_active) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      if (_active) _connectInternal();
    });
  }

  void _cleanupSocket() {
    _pingTimer?.cancel();
    final socket = _socket;
    _socket = null;
    try {
      socket?.close();
    } catch (_) {}
  }

  void disconnect() {
    _active = false;
    _attempt++;
    _token = null;
    _reconnectTimer?.cancel();
    _cleanupSocket();
  }
}
