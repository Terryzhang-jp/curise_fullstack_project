'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface Ship {
  id: number;
  name: string;
  company_id: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [countryId, setCountryId] = useState<string>('');
  const [shipId, setShipId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);

  useEffect(() => {
    fetchCountries();
    fetchShips();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
      if (!response.ok) {
        throw new Error('获取国家列表失败');
      }
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setError('获取国家列表失败');
    }
  };

  const fetchShips = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SHIPS));
      if (!response.ok) {
        throw new Error('获取船舶列表失败');
      }
      const data = await response.json();
      setShips(data);
    } catch (error) {
      console.error('Error fetching ships:', error);
      setError('获取船舶列表失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('请选择要上传的文件');
      return;
    }

    if (!countryId) {
      setError('请选择国家');
      return;
    }

    if (!shipId) {
      setError('请选择船舶');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('country_id', countryId);
    formData.append('ship_id', shipId);

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER-ANALYSIS), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '上传失败');
      }

      const data = await response.json();
      router.push(`/order-analysis/upload/${data.id}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">上传订单</h1>
        <Link href="/order-analysis">
          <Button variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="country">选择国家</Label>
            <select
              id="country"
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择国家</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="ship">选择船舶</Label>
            <select
              id="ship"
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择船舶</option>
              {ships.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="file">选择文件</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="mt-1 text-sm text-gray-500">
              支持的文件格式：Excel (.xlsx, .xls)
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!file || !countryId || !shipId || isUploading}
            className="w-full"
          >
            {isUploading ? '上传中...' : '上传'}
          </Button>
        </form>
      </div>
    </div>
  );
} 