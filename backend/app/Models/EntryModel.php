<?php

namespace App\Models;

use CodeIgniter\Model;

class EntryModel extends Model
{
	protected $table = 'entries';
	protected $primaryKey = 'id';
	protected $returnType = 'array';
	protected $useTimestamps = true;
	protected $allowedFields = [
		'user_id',
		'work_date',
		'morning_in',
		'morning_out',
		'afternoon_in',
		'afternoon_out',
		'status',
		'total_minutes',
		'notes',
	];
}