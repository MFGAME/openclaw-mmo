"""
经验值和升级系统
"""
from typing import Dict


class ExperienceSystem:
    """经验值系统"""
    
    # 经验值等级表（等级 -> 所需总经验）
    LEVEL_EXP_TABLE = {
        1: 0,
        2: 100,
        3: 300,
        4: 600,
        5: 1000,
        6: 1500,
        7: 2100,
        8: 2800,
        9: 3600,
        10: 4500,
        11: 5500,
        12: 6600,
        13: 7800,
        14: 9100,
        15: 10500,
        20: 20000,
        25: 35000,
        30: 55000,
        50: 150000,
        100: 1000000
    }
    
    @staticmethod
    def calculate_exp_gained(
        defeated_monster_level: int,
        defeated_monster_exp_yield: int,
        is_wild: bool = True
    ) -> int:
        """
        计算战胜怪物获得的经验值
        
        Args:
            defeated_monster_level: 战败怪物等级
            defeated_monster_exp_yield: 战败怪物的经验值产出
            is_wild: 是否野生怪物
        
        Returns:
            获得的经验值
        """
        # 基础经验值
        base_exp = defeated_monster_exp_yield * defeated_monster_level / 5
        
        # 野生怪物经验值较少
        wild_multiplier = 1.0 if not is_wild else 0.8
        
        # 最终经验值
        exp = int(base_exp * wild_multiplier)
        
        return max(1, exp)
    
    @staticmethod
    def add_exp(monster: Dict, exp_gained: int) -> Dict:
        """
        给怪物添加经验值
        
        Args:
            monster: 怪物数据
            exp_gained: 获得的经验值
        
        Returns:
            添加结果（包含升级信息）
        """
        result = {
            "exp_gained": exp_gained,
            "levels_up": 0,
            "new_level": monster['level'],
            "new_exp": monster['exp'] + exp_gained,
            "stats_increased": {}
        }
        
        # 添加经验值
        monster['exp'] += exp_gained
        
        # 检查是否升级
        while True:
            exp_needed = ExperienceSystem.get_exp_needed_for_next_level(monster['level'])
            
            if monster['exp'] >= exp_needed and monster['level'] < 100:
                # 升级
                monster['exp'] -= exp_needed
                monster['level'] += 1
                result['levels_up'] += 1
                result['new_level'] = monster['level']
                
                # 增加属性
                stats_increased = ExperienceSystem.increase_stats_on_level_up(monster)
                result['stats_increased'] = stats_increased
                
                # 学习新技能（如果有的话）
                # TODO: 添加技能学习逻辑
            else:
                break
        
        result['new_exp'] = monster['exp']
        
        return result
    
    @staticmethod
    def get_exp_needed_for_next_level(current_level: int) -> int:
        """
        获取升到下一级所需的经验值
        
        Args:
            current_level: 当前等级
        
        Returns:
            所需经验值
        """
        if current_level >= 100:
            return 999999999
        
        next_level = current_level + 1
        
        # 从等级表获取
        if next_level in ExperienceSystem.LEVEL_EXP_TABLE:
            current_exp = ExperienceSystem.LEVEL_EXP_TABLE.get(current_level, 0)
            next_exp = ExperienceSystem.LEVEL_EXP_TABLE[next_level]
            return next_exp - current_exp
        
        # 线性插值计算
        lower_level = max(k for k in ExperienceSystem.LEVEL_EXP_TABLE.keys() if k <= current_level)
        upper_level = min(k for k in ExperienceSystem.LEVEL_EXP_TABLE.keys() if k >= next_level)
        
        if lower_level == upper_level:
            return 0
        
        lower_exp = ExperienceSystem.LEVEL_EXP_TABLE[lower_level]
        upper_exp = ExperienceSystem.LEVEL_EXP_TABLE[upper_level]
        
        ratio = (current_level - lower_level) / (upper_level - lower_level)
        current_total_exp = lower_exp + (upper_exp - lower_exp) * ratio
        next_total_exp = lower_exp + (upper_exp - lower_exp) * ((next_level - lower_level) / (upper_level - lower_level))
        
        return int(next_total_exp - current_total_exp)
    
    @staticmethod
    def increase_stats_on_level_up(monster: Dict) -> Dict:
        """
        升级时增加属性
        
        Args:
            monster: 怪物数据
        
        Returns:
            增加的属性值
        """
        # 获取基础增长率（每个怪物不同）
        # 这里使用简化版本，实际应该从怪物模板获取
        growth_rates = {
            "hp": random.randint(2, 5),
            "attack": random.randint(1, 3),
            "defense": random.randint(1, 3),
            "speed": random.randint(1, 3),
            "special_attack": random.randint(1, 3),
            "special_defense": random.randint(1, 3)
        }
        
        # 增加属性
        stats_increased = {}
        for stat, increase in growth_rates.items():
            if stat in monster:
                old_value = monster[stat]
                monster[stat] += increase
                stats_increased[stat] = increase
        
        # 特殊处理HP
        if 'max_hp' in monster:
            hp_increase = growth_rates.get('hp', 2)
            monster['max_hp'] += hp_increase
            monster['hp'] += hp_increase  # 升级时恢复HP
            stats_increased['max_hp'] = hp_increase
        
        return stats_increased


# 经验值系统实例
exp_system = ExperienceSystem()


# 测试代码
if __name__ == "__main__":
    # 测试经验值计算
    exp = exp_system.calculate_exp_gained(defeated_monster_level=5, defeated_monster_exp_yield=64)
    print(f"战胜5级怪物获得经验值: {exp}")
    
    # 测试升级
    test_monster = {
        "level": 5,
        "exp": 0,
        "hp": 100,
        "max_hp": 100,
        "attack": 50,
        "defense": 40,
        "speed": 30,
        "special_attack": 40,
        "special_defense": 40
    }
    
    result = exp_system.add_exp(test_monster, 500)
    print(f"\n获得 {result['exp_gained']} 经验值")
    print(f"升级: {result['levels_up']} 级")
    print(f"当前等级: {result['new_level']}")
    print(f"当前经验: {result['new_exp']}")
    print(f"属性增加: {result['stats_increased']}")
