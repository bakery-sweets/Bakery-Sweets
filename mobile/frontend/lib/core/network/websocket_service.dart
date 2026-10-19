import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  String? _currentUserName;
  bool _isDisposed = false;

  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;

  bool get isConnected => _socket != null && _socket!.readyState == WebSocket.open;

  void connect(String userName) {
    if (_currentUserName == userName && isConnected) return;
    _currentUserName = userName;
    _isDisposed = false;
    _connectInternal();
  }

  Future<void> _connectInternal() async {
    if (_currentUserName == null || _isDisposed) return;

    try {
      _cleanupSocket();
      final url = AppConfig.wsNotificationUrl(_currentUserName!);
      if (kDebugMode) {
        debugPrint('[WebSocket] Connecting to $url');
      }

      _socket = await WebSocket.connect(url).timeout(const Duration(seconds: 8));

      if (kDebugMode) {
        debugPrint('[WebSocket] Connected successfully for $_currentUserName');
      }

      _startPing();

      _socket!.listen(
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
          _scheduleReconnect();
        },
        onDone: () {
          if (kDebugMode) {
            debugPrint('[WebSocket] Connection closed');
          }
          _scheduleReconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[WebSocket] Connect failed: $e');
      }
      _scheduleReconnect();
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
    if (_isDisposed || _currentUserName == null) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      if (!_isDisposed && _currentUserName != null) {
        _connectInternal();
      }
    });
  }

  void _cleanupSocket() {
    _pingTimer?.cancel();
    try {
      _socket?.close();
    } catch (_) {}
    _socket = null;
  }

  void disconnect() {
    _isDisposed = true;
    _currentUserName = null;
    _reconnectTimer?.cancel();
    _cleanupSocket();
  }
}
