"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Unlock, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Timer,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailSendLockProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  children: React.ReactNode;
  lockMessage?: string;
  confirmationText?: string;
  autoLockTimeout?: number; // 自动锁定超时时间（秒）
}

export default function EmailSendLock({
  isLocked,
  onUnlock,
  onLock,
  children,
  lockMessage = "邮件发送已锁定，防止误触发送",
  confirmationText = "我确认我即将发送",
  autoLockTimeout = 300 // 5分钟自动锁定
}: EmailSendLockProps) {
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // 自动锁定计时器
  useEffect(() => {
    if (!isLocked && autoLockTimeout > 0) {
      setTimeRemaining(autoLockTimeout);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            onLock();
            toast.info('邮件发送已自动锁定');
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        setTimeRemaining(null);
      };
    }
  }, [isLocked, autoLockTimeout, onLock]);

  // 处理解锁
  const handleUnlock = async () => {
    if (inputValue.trim() !== confirmationText) {
      toast.error('确认文本不正确，请重新输入');
      return;
    }

    setIsUnlocking(true);
    
    // 模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsUnlocking(false);
    setShowUnlockDialog(false);
    setInputValue('');
    onUnlock();
    
    toast.success('邮件发送已解锁，请谨慎操作');
  };

  // 处理锁定
  const handleLock = () => {
    onLock();
    setTimeRemaining(null);
    toast.info('邮件发送已锁定');
  };

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* 锁定状态指示器 */}
      <Card className={`border-2 ${isLocked ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLocked ? (
                <Lock className="h-5 w-5 text-red-600" />
              ) : (
                <Unlock className="h-5 w-5 text-green-600" />
              )}
              
              <div>
                <p className={`font-medium ${isLocked ? 'text-red-800' : 'text-green-800'}`}>
                  {isLocked ? '🔒 邮件发送已锁定' : '🔓 邮件发送已解锁'}
                </p>
                <p className={`text-sm ${isLocked ? 'text-red-600' : 'text-green-600'}`}>
                  {isLocked ? lockMessage : '可以发送邮件，请谨慎操作'}
                </p>
                
                {!isLocked && timeRemaining && (
                  <p className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                    <Timer className="h-3 w-3" />
                    自动锁定倒计时: {formatTimeRemaining(timeRemaining)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnlockDialog(true)}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  解锁发送
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLock}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  锁定发送
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邮件发送区域 */}
      <div className={`transition-all duration-300 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>

      {/* 解锁确认对话框 */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              确认解锁邮件发送
            </DialogTitle>
            <DialogDescription>
              为了防止误操作，请输入确认文本来解锁邮件发送功能。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>请注意：</strong>解锁后您将能够发送邮件给供应商。请确保所有信息都已确认无误。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                请输入确认文本：<span className="font-mono text-blue-600">"{confirmationText}"</span>
              </Label>
              <Input
                id="confirmation"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmationText}
                className="font-mono"
                autoComplete="off"
              />
              
              {inputValue && inputValue !== confirmationText && (
                <p className="text-sm text-red-600">
                  确认文本不匹配，请重新输入
                </p>
              )}
              
              {inputValue === confirmationText && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  确认文本正确
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnlockDialog(false);
                setInputValue('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={inputValue !== confirmationText || isUnlocking}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUnlocking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  验证中...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  确认解锁
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
