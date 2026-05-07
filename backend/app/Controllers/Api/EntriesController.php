<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\EntryModel;

class EntriesController extends BaseController
{
	private function jsonPayload()
	{
		$body = file_get_contents('php://input');
		$payload = json_decode($body ?: '', true);

		if (is_array($payload)) {
			return $payload;
		}

		return $_POST;
	}

	private function authenticatedUser()
	{
		$user = session()->get('auth_user');
		if (!$user || !isset($user['id'])) {
			return null;
		}

		return $user;
	}

	private function toMinutes($time)
	{
		if (!is_string($time) || strpos($time, ':') === false) {
			return null;
		}

		$parts = explode(':', $time);
		$hours = isset($parts[0]) ? (int) $parts[0] : 0;
		$minutes = isset($parts[1]) ? (int) $parts[1] : 0;

		return ($hours * 60) + $minutes;
	}

	private function normalizeTime($time)
	{
		if (!is_string($time)) {
			return null;
		}

		$trimmed = trim($time);
		if ($trimmed === '') {
			return null;
		}

		if (preg_match('/^\d{2}:\d{2}$/', $trimmed) === 1) {
			return $trimmed . ':00';
		}

		if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $trimmed) === 1) {
			return $trimmed;
		}

		return null;
	}

	private function buildEntryData(array $payload)
	{
		$workDate = isset($payload['workDate']) ? trim((string) $payload['workDate']) : '';
		if ($workDate === '' || preg_match('/^\d{4}-\d{2}-\d{2}$/', $workDate) !== 1) {
			return ['error' => 'Invalid work date.'];
		}

		$noOjtClass = !empty($payload['noOjtClass']);

		$morningIn = $this->normalizeTime(isset($payload['morningIn']) ? $payload['morningIn'] : null);
		$morningOut = $this->normalizeTime(isset($payload['morningOut']) ? $payload['morningOut'] : null);
		$afternoonIn = $this->normalizeTime(isset($payload['afternoonIn']) ? $payload['afternoonIn'] : null);
		$afternoonOut = $this->normalizeTime(isset($payload['afternoonOut']) ? $payload['afternoonOut'] : null);

		if (!$noOjtClass) {
			if (!$morningIn || !$morningOut || !$afternoonIn || !$afternoonOut) {
				return ['error' => 'Please complete all time fields, or check "No OJT class".'];
			}

			$morningMinutes = $this->toMinutes($morningOut) - $this->toMinutes($morningIn);
			$afternoonMinutes = $this->toMinutes($afternoonOut) - $this->toMinutes($afternoonIn);

			if ($morningMinutes <= 0 || $afternoonMinutes <= 0) {
				return ['error' => 'Time out must be later than time in for each session.'];
			}
		} else {
			$morningMinutes = 0;
			$afternoonMinutes = 0;
		}

		return [
			'data' => [
				'work_date' => $workDate,
				'morning_in' => $morningIn,
				'morning_out' => $morningOut,
				'afternoon_in' => $afternoonIn,
				'afternoon_out' => $afternoonOut,
				'status' => $noOjtClass ? 'No OJT Class' : 'OJT Day',
				'total_minutes' => $morningMinutes + $afternoonMinutes,
			],
		];
	}

	private function normalizeNotes($notes)
	{
		if (!is_string($notes)) {
			return '';
		}

		return trim($notes);
	}

	private function serializeEntry(array $entry)
	{
		return [
			'id' => (int) $entry['id'],
			'workDate' => $entry['work_date'],
			'morningIn' => $entry['morning_in'] ? substr($entry['morning_in'], 0, 5) : '',
			'morningOut' => $entry['morning_out'] ? substr($entry['morning_out'], 0, 5) : '',
			'afternoonIn' => $entry['afternoon_in'] ? substr($entry['afternoon_in'], 0, 5) : '',
			'afternoonOut' => $entry['afternoon_out'] ? substr($entry['afternoon_out'], 0, 5) : '',
			'noOjtClass' => $entry['status'] === 'No OJT Class',
			'status' => $entry['status'],
			'totalMinutes' => (int) $entry['total_minutes'],
			'notes' => isset($entry['notes']) ? (string) $entry['notes'] : '',
		];
	}

	public function index()
	{
		$user = $this->authenticatedUser();
		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		$model = new EntryModel();
		$rows = $model
			->where('user_id', (int) $user['id'])
			->orderBy('work_date', 'ASC')
			->findAll();

		$entries = array_map(function ($row) {
			return $this->serializeEntry($row);
		}, $rows);

		return $this->response->setJSON([
			'status' => 'success',
			'entries' => $entries,
		]);
	}

	public function create()
	{
		$user = $this->authenticatedUser();
		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		$payload = $this->jsonPayload();
		$built = $this->buildEntryData($payload);

		if (isset($built['error'])) {
			return $this->response->setStatusCode(422)->setJSON([
				'status' => 'error',
				'message' => $built['error'],
			]);
		}

		$model = new EntryModel();
		$data = $built['data'];
		$data['user_id'] = (int) $user['id'];

		$entryId = $model->insert($data, true);
		$entry = $model->find($entryId);

		return $this->response->setJSON([
			'status' => 'success',
			'entry' => $this->serializeEntry($entry),
		]);
	}

	public function update($id = null)
	{
		$user = $this->authenticatedUser();
		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		$entryId = (int) $id;
		if ($entryId <= 0) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$model = new EntryModel();
		$entry = $model->where('id', $entryId)->where('user_id', (int) $user['id'])->first();

		if (!$entry) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$payload = $this->jsonPayload();
		$built = $this->buildEntryData($payload);

		if (isset($built['error'])) {
			return $this->response->setStatusCode(422)->setJSON([
				'status' => 'error',
				'message' => $built['error'],
			]);
		}

		$model->update($entryId, $built['data']);
		$updated = $model->find($entryId);

		return $this->response->setJSON([
			'status' => 'success',
			'entry' => $this->serializeEntry($updated),
		]);
	}

	public function notes($id = null)
	{
		$user = $this->authenticatedUser();
		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		$entryId = (int) $id;
		if ($entryId <= 0) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$model = new EntryModel();
		$entry = $model->where('id', $entryId)->where('user_id', (int) $user['id'])->first();

		if (!$entry) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$payload = $this->jsonPayload();
		$notes = $this->normalizeNotes(isset($payload['notes']) ? $payload['notes'] : null);

		$model->update($entryId, ['notes' => $notes]);
		$updated = $model->find($entryId);

		return $this->response->setJSON([
			'status' => 'success',
			'entry' => $this->serializeEntry($updated),
		]);
	}

	public function delete($id = null)
	{
		$user = $this->authenticatedUser();
		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		$entryId = (int) $id;
		if ($entryId <= 0) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$model = new EntryModel();
		$entry = $model->where('id', $entryId)->where('user_id', (int) $user['id'])->first();

		if (!$entry) {
			return $this->response->setStatusCode(404)->setJSON([
				'status' => 'error',
				'message' => 'Entry not found',
			]);
		}

		$model->delete($entryId);

		return $this->response->setJSON([
			'status' => 'success',
			'message' => 'Entry deleted',
		]);
	}
}